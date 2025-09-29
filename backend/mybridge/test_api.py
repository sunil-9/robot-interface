#!/usr/bin/env python3
"""
Test script for Robot Teaching Interface Backend APIs
"""

import asyncio
import json
from datetime import datetime

import requests
import websockets

BASE_URL = "http://localhost:8080"
WS_URL = "ws://localhost:8080/ws"

def test_health_endpoints():
    """Test health check endpoints"""
    print("🩺 Testing health endpoints...")
    
    try:
        # Test root endpoint
        response = requests.get(f"{BASE_URL}/")
        print(f"Root endpoint: {response.status_code} - {response.json()}")
        
        # Test health endpoint
        response = requests.get(f"{BASE_URL}/health")
        print(f"Health endpoint: {response.status_code} - {response.json()}")
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Make sure it's running!")
        return False
    
    return True

def test_episode_apis():
    """Test episode management APIs"""
    print("\n📝 Testing episode APIs...")
    
    try:
        # Test start episode
        start_data = {"name": f"Test Episode {datetime.now().strftime('%H:%M:%S')}"}
        response = requests.post(f"{BASE_URL}/api/episodes/start", json=start_data)
        print(f"Start episode: {response.status_code} - {response.json()}")
        
        if response.status_code == 200:
            episode_data = response.json()
            episode_id = episode_data.get("episode", {}).get("id")
            
            # Test get current episode
            response = requests.get(f"{BASE_URL}/api/episodes/current")
            print(f"Current episode: {response.status_code} - {response.json()}")
            
            # Test get all episodes
            response = requests.get(f"{BASE_URL}/api/episodes/")
            print(f"All episodes: {response.status_code} - Found {len(response.json())} episodes")
            
            # Test rewind episode
            response = requests.post(f"{BASE_URL}/api/episodes/rewind")
            print(f"Rewind episode: {response.status_code} - {response.json()}")
            
            # Test end episode
            response = requests.post(f"{BASE_URL}/api/episodes/end")
            print(f"End episode: {response.status_code} - {response.json()}")
            
            # Test replay episode
            if episode_id:
                replay_data = {"episode_id": episode_id, "speed": 1.5}
                response = requests.post(f"{BASE_URL}/api/episodes/replay", json=replay_data)
                print(f"Replay episode: {response.status_code} - {response.json()}")
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server for episode APIs!")
        return False
    
    return True

async def test_websocket():
    """Test WebSocket connection"""
    print("\n🔌 Testing WebSocket...")
    
    try:
        async with websockets.connect(WS_URL) as websocket:
            print("✅ WebSocket connected!")
            
            # Send ping
            ping_msg = {"type": "ping", "timestamp": datetime.now().timestamp()}
            await websocket.send(json.dumps(ping_msg))
            print(f"📤 Sent ping: {ping_msg}")
            
            # Wait for messages
            try:
                for i in range(3):  # Listen for 3 messages
                    message = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                    data = json.loads(message)
                    print(f"📥 Received: {data.get('type', 'data')} - {len(str(data))} chars")
            except asyncio.TimeoutError:
                print("⏰ No messages received (timeout)")
            
            print("✅ WebSocket test completed")
            
    except Exception as e:
        print(f"❌ WebSocket test failed: {e}")
        return False
    
    return True

async def main():
    """Run all tests"""
    print("🧪 Robot Teaching Interface Backend - API Tests")
    print("=" * 50)
    
    # Test health endpoints
    if not test_health_endpoints():
        return
    
    # Test episode APIs
    test_episode_apis()
    
    # Test WebSocket
    await test_websocket()
    
    print("\n✅ All tests completed!")

if __name__ == "__main__":
    asyncio.run(main())