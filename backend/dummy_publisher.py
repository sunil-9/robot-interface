#!/usr/bin/env python3

import math
import random
import time

import numpy as np
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image, JointState
from std_msgs.msg import Float64MultiArray


# Create color images for round-robin cycling
def create_color_image(color, height=480, width=640):
    """Create a solid color image"""
    image = np.zeros((height, width, 3), dtype=np.uint8)
    if color == 'red':
        image[:, :, 0] = 255  # Red channel
    elif color == 'green':
        image[:, :, 1] = 255  # Green channel
    elif color == 'blue':
        image[:, :, 2] = 255  # Blue channel
    return image

# Pre-generate color images
red_image = create_color_image('red')
green_image = create_color_image('green')
blue_image = create_color_image('blue')
color_images = [red_image, green_image, blue_image]
color_names = ['red', 'green', 'blue']

class CameraPublisher(Node):
    def __init__(self):
        super().__init__('camera_publisher')

        # Create publishers for all topics
        self.rgb_base_publisher = self.create_publisher(Image, '/rgb_base', 10)
        self.rgb_wrist_publisher = self.create_publisher(Image, '/rgb_wrist', 10)
        self.rgb_base_attention_mask_publisher = self.create_publisher(Image, '/rgb_base_attention_mask', 10)
        self.rgb_wrist_attention_mask_publisher = self.create_publisher(Image, '/rgb_wrist_attention_mask', 10)
        self.joint_state_publisher = self.create_publisher(JointState, '/joint_states_for_collection', 10)
        self.joint_command_publisher = self.create_publisher(JointState, '/joint_command_for_collection', 10)
        self.action_variance_publisher = self.create_publisher(Float64MultiArray, '/action_variance_windows', 10)

        # Color cycling state
        self.color_index = 0
        
        # Pre-generate color image data
        self.color_image_data = [img.flatten().tobytes() for img in color_images]
        
        # Attention mask persistence
        self.mask_update_counter = 0
        self.mask_update_frequency = 6  # Update masks every 3 seconds (6 cycles * 0.5s)
        self.current_base_mask = None
        self.current_wrist_mask = None

        # Base values for joint data (will be varied)
        self.base_positions = [
            0.0234,    # front_left_wheel
            0.0242,    # front_right_wheel
            0.0939,    # kinova_arm_joint_1
            0.023,     # rear_left_wheel
            0.0235,    # rear_right_wheel
            0.0195,    # kinova_arm_joint_2
            1.5186,    # kinova_arm_joint_3
            -1.5742,   # kinova_arm_joint_4
            -1.6279,   # kinova_arm_joint_5
            1.6827,    # kinova_arm_joint_6
            0.0,       # finger_joint
            -0.0001,   # left_inner_knuckle_joint
            0.0,       # right_inner_knuckle_joint
            0.0,       # right_outer_knuckle_joint
            0.0,       # left_inner_finger_joint
            0.0001     # right_inner_finger_joint
        ]
        
        self.base_velocities = [
            0.0328,    # front_left_wheel
            0.0469,    # front_right_wheel
            -0.0636,   # kinova_arm_joint_1
            0.0272,    # rear_left_wheel
            0.0411,    # rear_right_wheel
            0.0945,    # kinova_arm_joint_2
            -0.0502,   # kinova_arm_joint_3
            -0.0987,   # kinova_arm_joint_4
            0.0496,    # kinova_arm_joint_5
            0.0858,    # kinova_arm_joint_6
            0.0207,    # finger_joint
            -0.0383,   # left_inner_knuckle_joint
            0.0293,    # right_inner_knuckle_joint
            0.0172,    # right_outer_knuckle_joint
            0.0208,    # left_inner_finger_joint
            0.1949     # right_inner_finger_joint
        ]
        
        self.base_efforts = [
            0.0051,    # front_left_wheel
            0.0372,    # front_right_wheel
            0.001,     # kinova_arm_joint_1
            -0.0096,   # rear_left_wheel
            -0.0331,   # rear_right_wheel
            5.3892,    # kinova_arm_joint_2
            -5.2529,   # kinova_arm_joint_3
            -1.0631,   # kinova_arm_joint_4
            -0.0405,   # kinova_arm_joint_5
            0.0,       # kinova_arm_joint_6
            -0.0172,   # finger_joint
            0.0092,    # left_inner_knuckle_joint
            0.0091,    # right_inner_knuckle_joint
            0.0171,    # right_outer_knuckle_joint
            -0.0014,   # left_inner_finger_joint
            -0.0014    # right_inner_finger_joint
        ]

        # Base joint command data (will be varied)
        self.base_command_positions = [
            0.0939680683428552,      # kinova_arm_joint_1
            1.518559829934047,       # kinova_arm_joint_3
            -1.6277024892648302,     # kinova_arm_joint_5
            0.019286768326440322,    # kinova_arm_joint_2
            -1.5746556776241745,     # kinova_arm_joint_4
            1.68270128215248,        # kinova_arm_joint_6
            0.0,                     # finger_joint
            0.0,                     # base_linear_forward
            0.0,                     # base_linear_backward
            0.0,                     # base_angular_left
            0.0                      # base_angular_right
        ]
        
        self.base_command_velocities = [0.0] * 11  # All zeros (will add variation)
        
        self.base_command_efforts = [
            float('nan'),  # kinova_arm_joint_1
            float('nan'),  # kinova_arm_joint_3
            float('nan'),  # kinova_arm_joint_5
            float('nan'),  # kinova_arm_joint_2
            float('nan'),  # kinova_arm_joint_4
            float('nan'),  # kinova_arm_joint_6
            0.0,           # finger_joint
            0.0,           # base_linear_forward
            0.0,           # base_linear_backward
            0.0,           # base_angular_left
            0.0            # base_angular_right
        ]
        
        # Time tracking for variation
        self.start_time = time.time()

        # Action variance data - 10 small values between 0.0 and 0.05
        self.action_variance_values = [random.uniform(0.0, 0.05) for _ in range(10)]
        self.action_variance_update_counter = 0
        self.action_variance_update_frequency = 4  # Update every 2 seconds (4 cycles * 0.5s)

        # Pre-allocate message objects (will be updated with varying data)
        self.base_image_msg = self.create_image_message('base_camera')
        self.wrist_image_msg = self.create_image_message('wrist_camera')
        self.base_attention_mask_msg = self.create_attention_mask_message('base_camera')
        self.wrist_attention_mask_msg = self.create_attention_mask_message('wrist_camera')
        self.joint_state_msg = self.create_joint_state_message()
        self.joint_command_msg = self.create_joint_command_message()
        self.action_variance_msg = self.create_action_variance_message()

        # Optimized: Reduce frequency from 10Hz to 2Hz to lower CPU usage
        self.timer = self.create_timer(0.5, self.publish_all_data)
        
        # Counter for reduced logging frequency
        self.publish_count = 0
        
        # Initialize masks
        self.current_base_mask = self.generate_random_attention_mask()
        self.current_wrist_mask = self.generate_random_attention_mask()

        self.get_logger().info('Camera publisher node started (2Hz, 480x640 color cycling images, persistent attention masks (3s), varying joint states + commands + action variance)')

    def create_image_message(self, frame_id):
        msg = Image()

        # Header
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.header.frame_id = frame_id

        # Image properties
        msg.height = 480
        msg.width = 640
        msg.encoding = 'rgb8'
        msg.is_bigendian = False
        msg.step = 1920  # width * 3 (RGB channels) = 640 * 3

        # Initial color (will be updated in publish method)
        msg.data = self.color_image_data[0]

        return msg

    def create_joint_state_message(self):
        msg = JointState()

        # Header
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.header.frame_id = ''  # Empty frame_id to match provided data

        # Joint names matching the provided structure
        msg.name = [
            'front_left_wheel',
            'front_right_wheel',
            'kinova_arm_joint_1',
            'rear_left_wheel',
            'rear_right_wheel',
            'kinova_arm_joint_2',
            'kinova_arm_joint_3',
            'kinova_arm_joint_4',
            'kinova_arm_joint_5',
            'kinova_arm_joint_6',
            'finger_joint',
            'left_inner_knuckle_joint',
            'right_inner_knuckle_joint',
            'right_outer_knuckle_joint',
            'left_inner_finger_joint',
            'right_inner_finger_joint'
        ]

        # Initial values (will be updated with variations in publish method)
        msg.position = self.base_positions.copy()
        msg.velocity = self.base_velocities.copy()
        msg.effort = self.base_efforts.copy()

        return msg

    def create_joint_command_message(self):
        msg = JointState()

        # Header
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.header.frame_id = 'base_link'  # base_link frame_id for command

        # Joint names matching the provided structure
        msg.name = [
            'kinova_arm_joint_1',
            'kinova_arm_joint_3',
            'kinova_arm_joint_5',
            'kinova_arm_joint_2',
            'kinova_arm_joint_4',
            'kinova_arm_joint_6',
            'finger_joint',
            'base_linear_forward',
            'base_linear_backward',
            'base_angular_left',
            'base_angular_right'
        ]

        # Initial values (will be updated with variations in publish method)
        msg.position = self.base_command_positions.copy()
        msg.velocity = self.base_command_velocities.copy()
        msg.effort = self.base_command_efforts.copy()

        return msg

    def create_attention_mask_message(self, frame_id):
        msg = Image()

        # Header
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.header.frame_id = frame_id

        # Image properties for grayscale mask (0s and 1s)
        msg.height = 480
        msg.width = 640
        msg.encoding = 'mono8'  # 8-bit grayscale for binary mask
        msg.is_bigendian = False
        msg.step = 640  # width * 1 (single channel) = 640 * 1

        # Initial mask (will be updated in publish method)
        msg.data = bytes([0] * (480 * 640))

        return msg

    def create_action_variance_message(self):
        msg = Float64MultiArray()
        # Initial values (will be updated in publish method)
        msg.data = self.action_variance_values.copy()
        return msg

    def generate_random_attention_mask(self):
        """Generate a random binary attention mask with clustered highlights"""
        mask = np.zeros((480, 640), dtype=np.uint8)
        
        # Create 3-5 random circular highlight regions
        num_regions = random.randint(3, 5)
        for _ in range(num_regions):
            # Random center point
            center_x = random.randint(50, 590)
            center_y = random.randint(50, 430)
            # Random radius (20-80 pixels)
            radius = random.randint(20, 80)
            
            # Create circular highlight region
            y, x = np.ogrid[:480, :640]
            mask_circle = ((x - center_x) ** 2 + (y - center_y) ** 2) <= radius ** 2
            mask[mask_circle] = 255
        
        return mask.flatten().tobytes()
    
    def get_persistent_mask(self, mask_type):
        """Get persistent attention mask that updates every few seconds"""
        if self.mask_update_counter % self.mask_update_frequency == 0:
            # Generate new masks
            if mask_type == 'base':
                self.current_base_mask = self.generate_random_attention_mask()
            else:  # wrist
                self.current_wrist_mask = self.generate_random_attention_mask()
        
        return self.current_base_mask if mask_type == 'base' else self.current_wrist_mask
    
    def get_varied_values(self, base_values, variation_factor=0.1):
        """Generate varying values based on time using sine waves"""
        current_time = time.time() - self.start_time
        varied_values = []
        
        for i, base_val in enumerate(base_values):
            if math.isnan(base_val):
                varied_values.append(base_val)  # Keep NaN values as is
            else:
                # Use different frequencies for different joints to create varied motion
                freq = 0.5 + (i * 0.1)  # Different frequency for each joint
                phase = i * 0.3  # Different phase for each joint
                variation = base_val * variation_factor * math.sin(freq * current_time + phase)
                varied_values.append(base_val + variation)
        
        return varied_values

    def update_action_variance(self):
        """Update action variance values every few seconds"""
        if self.action_variance_update_counter % self.action_variance_update_frequency == 0:
            # Update each value with small random changes
            for i in range(10):
                # Add small random change
                change = random.uniform(-0.008, 0.008)
                new_value = self.action_variance_values[i] + change
                # Keep values in range [0.0, 0.05]
                self.action_variance_values[i] = max(0.0, min(0.05, new_value))
        
        self.action_variance_update_counter += 1

    def publish_all_data(self):
        current_time = self.get_clock().now().to_msg()
        
        # Update color cycling for images
        current_color_index = self.color_index % 3
        
        # Update base camera image with current color and timestamp
        self.base_image_msg.header.stamp = current_time
        self.base_image_msg.data = self.color_image_data[current_color_index]
        self.rgb_base_publisher.publish(self.base_image_msg)

        # Update wrist camera image with next color and timestamp
        wrist_color_index = (self.color_index + 1) % 3
        self.wrist_image_msg.header.stamp = current_time
        self.wrist_image_msg.data = self.color_image_data[wrist_color_index]
        self.rgb_wrist_publisher.publish(self.wrist_image_msg)

        # Update and publish attention masks (persistent for 3 seconds)
        self.base_attention_mask_msg.header.stamp = current_time
        self.base_attention_mask_msg.data = self.get_persistent_mask('base')
        self.rgb_base_attention_mask_publisher.publish(self.base_attention_mask_msg)

        self.wrist_attention_mask_msg.header.stamp = current_time
        self.wrist_attention_mask_msg.data = self.get_persistent_mask('wrist')
        self.rgb_wrist_attention_mask_publisher.publish(self.wrist_attention_mask_msg)
        
        # Increment mask update counter
        self.mask_update_counter += 1

        # Update joint state with varying values
        self.joint_state_msg.header.stamp = current_time
        self.joint_state_msg.position = self.get_varied_values(self.base_positions, 0.1)
        self.joint_state_msg.velocity = self.get_varied_values(self.base_velocities, 0.2)
        self.joint_state_msg.effort = self.get_varied_values(self.base_efforts, 0.15)
        self.joint_state_publisher.publish(self.joint_state_msg)

        # Update joint command with varying values
        self.joint_command_msg.header.stamp = current_time
        self.joint_command_msg.position = self.get_varied_values(self.base_command_positions, 0.08)
        self.joint_command_msg.velocity = self.get_varied_values(self.base_command_velocities, 0.3)
        self.joint_command_msg.effort = self.get_varied_values(self.base_command_efforts, 0.1)
        self.joint_command_publisher.publish(self.joint_command_msg)

        # Update and publish action variance
        self.update_action_variance()
        self.action_variance_msg.data = self.action_variance_values.copy()
        self.action_variance_publisher.publish(self.action_variance_msg)

        # Advance color index for next cycle
        self.color_index += 1

        # Reduce logging frequency - only log every 10th publish (every 5 seconds at 2Hz)
        self.publish_count += 1
        if self.publish_count % 10 == 0:
            current_colors = f"{color_names[current_color_index]}/{color_names[wrist_color_index]}"
            # Format action variance values for logging
            variance_str = ", ".join([f"{v:.4f}" for v in self.action_variance_values[:3]]) + "..."
            self.get_logger().info(f'Published images ({current_colors}), attention masks, varying joint states, commands, action variance [{variance_str}] (count: {self.publish_count})')

def main(args=None):
    rclpy.init(args=args)
    node = CameraPublisher()

    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()