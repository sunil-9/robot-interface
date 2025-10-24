"""
WebRTC signaling router
HTTP-based signaling endpoints and aiortc integration to stream ROS2 camera frames.
"""

import asyncio
import base64
import json
import logging
import math
import uuid
from typing import Any, Dict, Optional

import av
import cv2
import numpy as np
from aiortc import RTCPeerConnection, RTCSessionDescription
from aiortc.mediastreams import VideoStreamTrack
from fastapi import APIRouter, Request
from pydantic import BaseModel

logger = logging.getLogger(__name__)


router = APIRouter()


class OfferRequest(BaseModel):
    sdp: str
    type: str = "offer"


class AnswerResponse(BaseModel):
    peer_id: str
    sdp: str
    type: str = "answer"


class IceCandidate(BaseModel):
    peer_id: str
    candidate: Dict[str, Any]


class AppStateVideoTrack(VideoStreamTrack):
    """Video track that reads latest frames from AppState.latest_data for a role."""

    def __init__(self, app_state, role: str, fallback_shape=(240, 320)):
        super().__init__()
        self.app_state = app_state
        self.role = role
        self.fallback_shape = fallback_shape
        self._last_ts = 0

    async def recv(self):
        # Pace ~30 FPS so we don't overwhelm the loop
        await asyncio.sleep(1 / 30)
        pts, time_base = await self.next_timestamp()

        frame_img = None
        try:
            data_entry = getattr(self.app_state, "latest_data", {}).get(self.role)
            b64 = None
            if data_entry and getattr(data_entry, "normalized", None):
                b64 = data_entry.normalized.get("data")
            if b64:
                raw = base64.b64decode(b64)
                arr = np.frombuffer(raw, dtype=np.uint8)
                img_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                if img_bgr is not None:
                    frame_img = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        except Exception as e:
            logger.debug("Frame decode failed for %s: %s", self.role, e)

        if frame_img is None:
            # fallback black frame
            h, w = self.fallback_shape
            frame_img = np.zeros((h, w, 3), dtype=np.uint8)

        frame = av.VideoFrame.from_ndarray(frame_img, format="rgb24")
        frame.pts = pts
        frame.time_base = time_base
        return frame


# In-memory peer store
_peers: Dict[str, RTCPeerConnection] = {}
_peer_tasks: Dict[str, asyncio.Task] = {}


@router.get("/health")
async def webrtc_health():
    return {"status": "ok", "peers": len(_peers)}


@router.post("/test")
async def test_connectivity():
    await asyncio.sleep(0.05)
    logger.info("WebRTC signaling test ok")
    return {"ok": True}


@router.post("/offer", response_model=AnswerResponse)
async def handle_offer(request: Request, offer: OfferRequest):
    """Accept an SDP offer, create RTCPeerConnection, attach camera tracks, and return answer."""
    from ..main import app_state  # access global AppState

    logger.info("Received SDP offer (len=%d)", len(offer.sdp))

    # Pre-generate peer id so event handlers can reference it immediately
    peer_id = str(uuid.uuid4())
    peer_ref = {"id": peer_id}

    pc = RTCPeerConnection()

    @pc.on("datachannel")
    def on_datachannel(channel):
        logger.info("DataChannel opened (label=%s)", channel.label)

        async def send_loop():
            logger.info("Starting datachannel send loop for %s", channel.label)
            while channel.readyState == "open":
                try:
                    # Build a payload of latest_data where models expose .dict()
                    payload = {}
                    for role, data in getattr(app_state, "latest_data", {}).items():
                        if hasattr(data, "dict"):
                            payload[role] = data.dict()
                        else:
                            payload[role] = data

                    # sanitize payload: replace NaN/Inf with null
                    def sanitize(obj):
                        if isinstance(obj, float):
                            if math.isnan(obj) or math.isinf(obj):
                                return None
                            return obj
                        if isinstance(obj, dict):
                            return {k: sanitize(v) for k, v in obj.items()}
                        if isinstance(obj, list):
                            return [sanitize(v) for v in obj]
                        return obj

                    safe_payload = sanitize(payload)
                    channel.send(json.dumps(safe_payload))
                except Exception as e:
                    logger.warning("Error sending over datachannel: %s", e)
                    break
                await asyncio.sleep(0.5)

        task = asyncio.create_task(send_loop())
        # store task if peer id is already assigned
        pid = peer_ref.get("id")
        if pid:
            _peer_tasks[pid] = task

    @pc.on("connectionstatechange")
    def on_connectionstatechange():
        logger.info("Peer connection state changed: %s", pc.connectionState)
        if pc.connectionState in ("failed", "closed"):
            # schedule cleanup
            async def _cleanup():
                # find peer id and cancel task
                for pid, conn in list(_peers.items()):
                    if conn is pc:
                        _peers.pop(pid, None)
                        task = _peer_tasks.pop(pid, None)
                        if task:
                            try:
                                task.cancel()
                            except Exception:
                                pass
                        break
                try:
                    await pc.close()
                except Exception:
                    pass

            asyncio.create_task(_cleanup())

    # Attach three camera tracks to match three video m-lines
    for role in ("camera_head", "camera_left", "camera_right"):
        pc.addTrack(AppStateVideoTrack(app_state, role))

    try:
        await pc.setRemoteDescription(RTCSessionDescription(sdp=offer.sdp, type=offer.type))
        answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
    except Exception as e:
        logger.exception("SDP negotiation failed: %s", e)
        await pc.close()
        raise

    # register peer and any tasks
    _peers[peer_id] = pc
    logger.info("Created peer %s", peer_id)

    # if a send task was created earlier, ensure it's tracked
    # (on_datachannel may have created a task and associated it with peer_ref)
    task = _peer_tasks.get(peer_id)
    if not task:
        # nothing to do; task will be stored when datachannel opens
        pass

    return AnswerResponse(peer_id=peer_id, sdp=pc.localDescription.sdp, type=pc.localDescription.type)


@router.post("/ice")
async def handle_ice(candidate: IceCandidate):
    pc = _peers.get(candidate.peer_id)
    if not pc:
        return {"ok": False, "error": "peer_not_found"}
    # aiortc will ignore remote ice candidates added before remote description; safe here
    try:
        from aiortc import RTCIceCandidate

        ice = RTCIceCandidate(
            sdpMid=candidate.candidate.get("sdpMid"),
            sdpMLineIndex=candidate.candidate.get("sdpMLineIndex"),
            candidate=candidate.candidate.get("candidate"),
        )
        await pc.addIceCandidate(ice)
    except Exception as e:
        logger.warning("Failed to add ICE candidate: %s", e)
        return {"ok": False}
    return {"ok": True}

