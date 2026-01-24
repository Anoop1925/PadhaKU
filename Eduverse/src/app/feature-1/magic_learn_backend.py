"""
Magic Learn Backend - Complete Implementation
Exact same functionality as app.py with all three features:
1. DrawInAir - Hand gesture drawing with MediaPipe
2. Image Reader - Image upload and analysis  
3. Plot Crafter - Story generation
"""

import os
import cv2
import base64
import numpy as np
from PIL import Image
import io
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import google.generativeai as genai
from mediapipe.python.solutions import hands, drawing_utils
from dotenv import load_dotenv
import threading
import time
import math
import signal
import sys

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# API KEY CONFIGURATION - Gemini for all features
DRAWINAIR_API_KEY = os.getenv('DRAWINAIR_API_KEY')
IMAGE_READER_API_KEYS = [
    os.getenv('IMAGE_READER_API_KEY'),
    os.getenv('IMAGE_READER_API_KEY_2'),
    os.getenv('IMAGE_READER_API_KEY_3'),
]
PLOT_CRAFTER_API_KEYS = [
    os.getenv('PLOT_CRAFTER_API_KEY'),
    os.getenv('PLOT_CRAFTER_API_KEY_2'),
    os.getenv('PLOT_CRAFTER_API_KEY_3'),
]

# Filter out None values (keys not set in .env)
IMAGE_READER_API_KEYS = [k for k in IMAGE_READER_API_KEYS if k]
PLOT_CRAFTER_API_KEYS = [k for k in PLOT_CRAFTER_API_KEYS if k]

# Track current key index for Gemini features (Image Reader and Plot Crafter)
current_image_reader_key_idx = 0
current_plot_crafter_key_idx = 0

if not DRAWINAIR_API_KEY or not IMAGE_READER_API_KEYS or not PLOT_CRAFTER_API_KEYS:
    raise ValueError("API keys required for all features. Add keys to .env file.")

print(f"✅ Loaded Gemini API key for DrawInAir")
print(f"✅ Loaded {len(IMAGE_READER_API_KEYS)} Image Reader API keys (Gemini)")
print(f"✅ Loaded {len(PLOT_CRAFTER_API_KEYS)} Plot Crafter API keys (Gemini)")

# Global variables for DrawInAir
camera = None
camera_lock = threading.Lock()
imgCanvas = None
mphands = None
current_frame = None
analysis_result = ""
current_gesture = "None"
p1, p2 = 0, 0  # Drawing position tracker

# SMART GESTURE LOCKING: Once you start drawing, stay in drawing mode
gesture_lock_mode = None  # Locks to Drawing/Moving/Erasing to prevent interruption
gesture_lock_counter = 0  # How many frames we've been in locked mode
LOCK_THRESHOLD = 3  # Frames needed to lock into a gesture
UNLOCK_THRESHOLD = 3  # Frames needed to unlock (REDUCED from 10 for instant response)
INTENTIONAL_SWITCH_THRESHOLD = 2  # Quick switch for intentional gesture changes

def get_next_api_key(feature='image_reader'):
    """
    Get next API key with automatic rotation on exhaustion (for Gemini features only)
    Returns: (api_key, key_index) tuple
    """
    global current_image_reader_key_idx, current_plot_crafter_key_idx
    
    if feature == 'image_reader':
        keys = IMAGE_READER_API_KEYS
        idx = current_image_reader_key_idx
    elif feature == 'plot_crafter':
        keys = PLOT_CRAFTER_API_KEYS
        idx = current_plot_crafter_key_idx
    else:
        raise ValueError(f"Unknown feature: {feature}")
    
    return keys[idx % len(keys)], idx

def rotate_api_key(feature='image_reader'):
    """
    Rotate to next API key when current one is exhausted (for Gemini features only)
    """
    global current_image_reader_key_idx, current_plot_crafter_key_idx
    
    if feature == 'image_reader':
        current_image_reader_key_idx = (current_image_reader_key_idx + 1) % len(IMAGE_READER_API_KEYS)
        print(f"🔄 Rotated Image Reader API key to index {current_image_reader_key_idx}")
    elif feature == 'plot_crafter':
        current_plot_crafter_key_idx = (current_plot_crafter_key_idx + 1) % len(PLOT_CRAFTER_API_KEYS)
        print(f"🔄 Rotated Plot Crafter API key to index {current_plot_crafter_key_idx}")

def initialize_camera():
    """Initialize camera and MediaPipe hands with OPTIMIZED settings for smooth tracking"""
    global camera, imgCanvas, mphands
    
    camera = cv2.VideoCapture(0)
    if not camera.isOpened():
        return False
    
    # Optimize camera settings for better performance
    camera.set(cv2.CAP_PROP_FRAME_WIDTH, 950)
    camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 550)
    camera.set(cv2.CAP_PROP_BRIGHTNESS, 130)
    camera.set(cv2.CAP_PROP_FPS, 30)  # Set to 30 FPS for smooth tracking
    
    imgCanvas = np.zeros(shape=(550, 950, 3), dtype=np.uint8)
    
    # OPTIMIZED MediaPipe settings for SMOOTH tracking
    mphands = hands.Hands(
        static_image_mode=False,  # Video mode for better tracking
        max_num_hands=1,  # Focus on one hand for better performance
        min_detection_confidence=0.7,  # Balanced detection
        min_tracking_confidence=0.65,  # Smoother tracking (was 0.75, lowered for less jitter)
        model_complexity=0  # Use lighter model for faster processing
    )
    
    return True

def process_frame_with_hands():
    """
    Process frame with hand tracking (OPTIMIZED for smooth left/right hand support)
    Returns the processed frame with drawing overlay
    """
    global camera, imgCanvas, mphands, current_gesture, p1, p2
    
    if camera is None or not camera.isOpened():
        return None
    
    success, img = camera.read()
    if not success or img is None:
        return None
    
    # Resize and flip for mirror effect
    img = cv2.resize(src=img, dsize=(950, 550))
    img = cv2.flip(src=img, flipCode=1)
    imgRGB = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Process hands with MediaPipe - configured for better tracking
    result = mphands.process(image=imgRGB)
    landmark_list = []
    hand_label = None  # Will be "Left" or "Right"
    
    if result.multi_hand_landmarks and result.multi_handedness:
        for idx, hand_lms in enumerate(result.multi_hand_landmarks):
            # Get hand label (Left/Right) from MediaPipe
            hand_label = result.multi_handedness[idx].classification[0].label
            
            # Draw hand landmarks smoothly
            drawing_utils.draw_landmarks(
                image=img,
                landmark_list=hand_lms,
                connections=hands.HAND_CONNECTIONS
            )
            
            # Get landmark coordinates
            for id, lm in enumerate(hand_lms.landmark):
                h, w, c = img.shape
                cx, cy = int(lm.x * w), int(lm.y * h)
                landmark_list.append([id, cx, cy])
    
    # UNIVERSAL FINGER DETECTION: Works perfectly for BOTH left and right hands
    fingers = []
    if landmark_list and hand_label:
        # SMART THUMB DETECTION: Independent logic for left vs right hand
        thumb_tip_x = landmark_list[4][1]
        thumb_ip_x = landmark_list[3][1]   # Thumb IP joint
        thumb_mcp_x = landmark_list[2][1]  # Thumb base
        wrist_x = landmark_list[0][1]
        
        # For MIRRORED camera view (flipCode=1), MediaPipe labels are OPPOSITE
        # When you show your RIGHT hand, MediaPipe sees "Left" (because of mirror)
        # So we need to INVERT the label
        actual_hand = "Right" if hand_label == "Left" else "Left"
        
        # INDEPENDENT THUMB LOGIC for each hand
        if actual_hand == "Right":
            # Right hand: Thumb extends to the RIGHT (positive X direction)
            # Thumb is UP if tip is farther RIGHT than base
            thumb_extended = thumb_tip_x > thumb_mcp_x + abs(thumb_mcp_x - wrist_x) * 0.15
        else:
            # Left hand: Thumb extends to the LEFT (negative X direction)  
            # Thumb is UP if tip is farther LEFT than base
            thumb_extended = thumb_tip_x < thumb_mcp_x - abs(thumb_mcp_x - wrist_x) * 0.15
        
        fingers.append(1 if thumb_extended else 0)
        
        # ADAPTIVE FINGER DETECTION: Uses proportional measurements
        # Calculate hand size for scale-independent detection
        wrist_y = landmark_list[0][2]
        middle_base_y = landmark_list[9][2]
        hand_size = abs(wrist_y - middle_base_y)
        
        # If hand is too close or detection failed, use fallback
        if hand_size < 50:
            hand_size = 100  # Reasonable default
        
        # Index, Middle, Ring, Pinky
        finger_landmarks = [
            [8, 6],    # Index: tip, pip (middle joint)
            [12, 10],  # Middle: tip, pip
            [16, 14],  # Ring: tip, pip
            [20, 18]   # Pinky: tip, pip
        ]
        
        for tip_id, pip_id in finger_landmarks:
            tip_y = landmark_list[tip_id][2]
            pip_y = landmark_list[pip_id][2]
            
            # Finger is "up" if tip is above pip by at least 15% of hand size
            # This adapts to different hand sizes and camera distances
            clearance_needed = hand_size * 0.15  # 15% of hand height
            
            if (pip_y - tip_y) > clearance_needed:
                fingers.append(1)
            else:
                fingers.append(0)
        
        # Visual feedback
        for i in range(0, 5):
            if fingers[i] == 1:
                cx, cy = landmark_list[(i + 1) * 4][1], landmark_list[(i + 1) * 4][2]
                cv2.circle(img=img, center=(cx, cy), radius=7, color=(0, 255, 0), thickness=-1)
                cv2.circle(img=img, center=(cx, cy), radius=8, color=(255, 255, 255), thickness=2)
    
    # INTELLIGENT GESTURE DETECTION with MODE LOCKING
    # Once you start drawing, stay locked in drawing mode unless you clearly change gesture
    global gesture_lock_mode, gesture_lock_counter
    
    detected_gesture = "None"
    
    if len(fingers) == 5:
        # Detect what gesture the raw finger data suggests
        if sum(fingers) == 2 and fingers[0] == 1 and fingers[1] == 1:
            detected_gesture = "Drawing"
        elif sum(fingers) == 3 and fingers[0] == 1 and fingers[1] == 1 and fingers[2] == 1:
            detected_gesture = "Moving"
        elif sum(fingers) == 2 and fingers[0] == 1 and fingers[2] == 1:
            detected_gesture = "Erasing"
        elif sum(fingers) == 2 and fingers[0] == 1 and fingers[4] == 1:
            detected_gesture = "Clearing"
        elif sum(fingers) == 2 and fingers[0] == 0 and fingers[1] == 1 and fingers[2] == 1:
            detected_gesture = "Analyzing"
    
    # SMART MODE LOCKING LOGIC with INSTANT intentional switching
    if gesture_lock_mode is None:
        # Not locked yet - need consistent gesture to lock
        if detected_gesture in ["Drawing", "Moving", "Erasing"]:
            gesture_lock_counter += 1
            if gesture_lock_counter >= LOCK_THRESHOLD:
                gesture_lock_mode = detected_gesture
                current_gesture = detected_gesture
            else:
                current_gesture = detected_gesture  # Use detected gesture while building lock
        else:
            gesture_lock_counter = 0
            current_gesture = detected_gesture
    else:
        # Already locked to a mode
        if detected_gesture == gesture_lock_mode:
            # Still doing the same gesture - stay locked
            gesture_lock_counter = 0  # Reset unlock counter
            current_gesture = gesture_lock_mode
        
        elif detected_gesture in ["Drawing", "Moving", "Erasing"] and detected_gesture != gesture_lock_mode:
            # User is trying to switch to a different primary gesture
            # CRITICAL: Distinguish between accidental flicker vs intentional change
            
            # Check if this is a "clear" gesture change (e.g., Drawing → Moving)
            # Drawing has 2 fingers (thumb+index)
            # Moving has 3 fingers (thumb+index+middle)
            # This is CLEARLY intentional, not accidental
            
            is_clear_intentional_switch = False
            
            # Drawing (2 fingers) → Moving (3 fingers) = INTENTIONAL
            if gesture_lock_mode == "Drawing" and detected_gesture == "Moving":
                is_clear_intentional_switch = True
            
            # Moving (3 fingers) → Drawing (2 fingers) = INTENTIONAL  
            elif gesture_lock_mode == "Moving" and detected_gesture == "Drawing":
                is_clear_intentional_switch = True
            
            # Drawing (2) → Erasing (2 different) = INTENTIONAL
            elif gesture_lock_mode == "Drawing" and detected_gesture == "Erasing":
                is_clear_intentional_switch = True
            
            # Any other switch between these modes
            elif gesture_lock_mode in ["Moving", "Erasing"]:
                is_clear_intentional_switch = True
            
            if is_clear_intentional_switch:
                # INSTANT SWITCH for clear intentional changes (just 2 frames confirmation)
                gesture_lock_counter += 1
                if gesture_lock_counter >= INTENTIONAL_SWITCH_THRESHOLD:
                    gesture_lock_mode = detected_gesture
                    gesture_lock_counter = 0
                    current_gesture = detected_gesture
                else:
                    # Show new gesture immediately even before lock confirms
                    current_gesture = detected_gesture
            else:
                # Unclear change - use normal unlock threshold
                gesture_lock_counter += 1
                if gesture_lock_counter >= UNLOCK_THRESHOLD:
                    gesture_lock_mode = detected_gesture
                    gesture_lock_counter = 0
                    current_gesture = detected_gesture
                else:
                    current_gesture = gesture_lock_mode
        
        elif detected_gesture in ["Clearing", "Analyzing"]:
            # Special gestures override lock immediately
            gesture_lock_mode = None
            gesture_lock_counter = 0
            current_gesture = detected_gesture
        
        elif detected_gesture == "None":
            # Hand not detected or resting - unlock after a delay
            gesture_lock_counter += 1
            if gesture_lock_counter >= UNLOCK_THRESHOLD:
                gesture_lock_mode = None
                gesture_lock_counter = 0
                current_gesture = "None"
            else:
                # Stay in locked mode briefly
                current_gesture = gesture_lock_mode
        else:
            # Unknown state - keep current lock
            current_gesture = gesture_lock_mode
    
    # EXECUTE CONFIRMED GESTURES
    if current_gesture == "Drawing" and len(fingers) == 5:
        cx, cy = landmark_list[8][1], landmark_list[8][2]
        
        if p1 == 0 and p2 == 0:
            p1, p2 = cx, cy
        else:
            cv2.line(img=imgCanvas, pt1=(p1, p2), pt2=(cx, cy), color=(255, 0, 255), thickness=6)
        p1, p2 = cx, cy
    
    elif current_gesture == "Moving" and len(fingers) == 5:
        cx, cy = landmark_list[8][1], landmark_list[8][2]
        cv2.circle(img=img, center=(cx, cy), radius=10, color=(0, 255, 0), thickness=2)
        p1, p2 = 0, 0
    
    elif current_gesture == "Erasing" and len(fingers) == 5:
        cx, cy = landmark_list[12][1], landmark_list[12][2]
        
        if p1 == 0 and p2 == 0:
            p1, p2 = cx, cy
        else:
            cv2.line(img=imgCanvas, pt1=(p1, p2), pt2=(cx, cy), color=(0, 0, 0), thickness=20)
        p1, p2 = cx, cy
    
    elif current_gesture == "Clearing":
        imgCanvas = np.zeros(shape=(550, 950, 3), dtype=np.uint8)
        gesture_lock_mode = None  # Unlock after clearing
        gesture_lock_counter = 0
        p1, p2 = 0, 0
    
    elif current_gesture == "Analyzing":
        gesture_lock_mode = None  # Unlock after analyzing
        gesture_lock_counter = 0
        p1, p2 = 0, 0
    
    else:
        p1, p2 = 0, 0
    
    # Blend canvas with video feed smoothly
    blended = cv2.addWeighted(src1=img, alpha=0.7, src2=imgCanvas, beta=1, gamma=0)
    imgGray = cv2.cvtColor(imgCanvas, cv2.COLOR_BGR2GRAY)
    _, imgInv = cv2.threshold(src=imgGray, thresh=50, maxval=255, type=cv2.THRESH_BINARY_INV)
    imgInv = cv2.cvtColor(imgInv, cv2.COLOR_GRAY2BGR)
    blended = cv2.bitwise_and(src1=blended, src2=imgInv)
    final_img = cv2.bitwise_or(src1=blended, src2=imgCanvas)
    
    return final_img

def generate_frames():
    """Generate video frames with hand tracking"""
    global current_frame
    
    while True:
        try:
            # Check if camera is still active
            if camera is None:
                print("Camera is None, stopping frame generation")
                break
                
            with camera_lock:
                frame = process_frame_with_hands()
                
                if frame is not None:
                    # Frame is already in BGR format from OpenCV
                    # Just encode it as JPEG for streaming
                    ret, buffer = cv2.imencode('.jpg', frame)
                    if ret:
                        frame_bytes = buffer.tobytes()
                        current_frame = frame
                        
                        yield (b'--frame\r\n'
                               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                else:
                    # If frame processing fails, wait a bit before retrying
                    time.sleep(0.1)
            
            time.sleep(0.033)  # ~30 FPS
        except Exception as e:
            print(f"Error in generate_frames: {e}")
            # If camera is stopped or error occurs, exit gracefully
            if camera is None:
                break
            time.sleep(0.1)

@app.route('/api/drawinair/start', methods=['POST'])
def start_drawinair():
    """Start DrawInAir - Initialize MediaPipe only (browser handles camera)"""
    try:
        global mphands, imgCanvas
        
        if imgCanvas is None:
            imgCanvas = np.zeros(shape=(550, 950, 3), dtype=np.uint8)
        
        if mphands is None:
            mphands = hands.Hands(
                static_image_mode=False,
                max_num_hands=1,
                min_detection_confidence=0.7,
                min_tracking_confidence=0.65,
                model_complexity=0
            )
        
        return jsonify({
            'success': True, 
            'message': 'DrawInAir initialized (browser-based camera)'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/drawinair/process-frame', methods=['POST'])
def process_browser_frame():
    """Process video frame with FULL hand gesture detection (like original)"""
    global imgCanvas, mphands, current_gesture, p1, p2
    
    try:
        data = request.json
        if not data or 'frame' not in data:
            return jsonify({'success': False, 'error': 'No frame data provided'}), 400
        
        # Decode base64 frame
        frame_data = data['frame']
        if ',' in frame_data:
            frame_data = frame_data.split(',')[1]
        
        img_bytes = base64.b64decode(frame_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({'success': False, 'error': 'Failed to decode frame'}), 400
        
        img = cv2.resize(img, (950, 550))
        
        # Mirror image horizontally (flip left-right for natural drawing)
        img = cv2.flip(img, 1)
        
        if imgCanvas is None:
            imgCanvas = np.zeros((550, 950, 3), dtype=np.uint8)
        
        # Process with MediaPipe
        imgRGB = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        result = mphands.process(imgRGB)
        
        landmark_list = []
        hand_label = None
        
        if result.multi_hand_landmarks:
            if result.multi_handedness:
                hand_label = result.multi_handedness[0].classification[0].label
            
            for hand_lms in result.multi_hand_landmarks:
                # Draw landmarks on image
                drawing_utils.draw_landmarks(
                    image=img,
                    landmark_list=hand_lms,
                    connections=hands.HAND_CONNECTIONS
                )
                
                # Get landmark coordinates
                for id, lm in enumerate(hand_lms.landmark):
                    h, w, c = img.shape
                    cx, cy = int(lm.x * w), int(lm.y * h)
                    landmark_list.append([id, cx, cy])
        
        # FULL GESTURE DETECTION (from original)
        fingers = []
        if landmark_list:
            # Thumb detection (different for left/right hand)
            if hand_label == "Right":
                if landmark_list[4][1] < landmark_list[3][1]:
                    fingers.append(1)
                else:
                    fingers.append(0)
            else:  # Left hand
                if landmark_list[4][1] > landmark_list[3][1]:
                    fingers.append(1)
                else:
                    fingers.append(0)
            
            # Other fingers
            for id in [8, 12, 16, 20]:
                if landmark_list[id][2] < landmark_list[id - 2][2]:
                    fingers.append(1)
                else:
                    fingers.append(0)
            
            # Draw yellow circles on ALL fingertips (whether up or down)
            fingertip_ids = [4, 8, 12, 16, 20]  # Thumb, Index, Middle, Ring, Pinky
            for tip_id in fingertip_ids:
                cx, cy = landmark_list[tip_id][1], landmark_list[tip_id][2]
                # Yellow circle with slight transparency effect
                cv2.circle(img, (cx, cy), 12, (0, 200, 255), 2)  # Yellow outer ring
                cv2.circle(img, (cx, cy), 8, (0, 220, 255), -1)  # Yellow filled center
        
        # GESTURE HANDLING
        if len(fingers) == 5:
            # Thumb + Index = Draw
            if sum(fingers) == 2 and fingers[0] == fingers[1] == 1:
                current_gesture = "Drawing"
                cx, cy = landmark_list[8][1], landmark_list[8][2]
                if p1 == 0 and p2 == 0:
                    p1, p2 = cx, cy
                cv2.line(imgCanvas, (p1, p2), (cx, cy), (255, 0, 255), 5)
                p1, p2 = cx, cy
            
            # Thumb + Index + Middle = Move
            elif sum(fingers) == 3 and fingers[0] == fingers[1] == fingers[2] == 1:
                current_gesture = "Moving"
                p1, p2 = 0, 0
            
            # Thumb + Middle = Erase
            elif sum(fingers) == 2 and fingers[0] == fingers[2] == 1:
                current_gesture = "Erasing"
                cx, cy = landmark_list[12][1], landmark_list[12][2]
                if p1 == 0 and p2 == 0:
                    p1, p2 = cx, cy
                cv2.line(imgCanvas, (p1, p2), (cx, cy), (0, 0, 0), 15)
                p1, p2 = cx, cy
            
            # Thumb + Pinky = Clear
            elif sum(fingers) == 2 and fingers[0] == fingers[4] == 1:
                current_gesture = "Clearing"
                imgCanvas = np.zeros((550, 950, 3), dtype=np.uint8)
                p1, p2 = 0, 0
            
            # Index + Middle = Analyze
            elif sum(fingers) == 2 and fingers[1] == fingers[2] == 1:
                current_gesture = "Analyzing"
                p1, p2 = 0, 0
            
            else:
                current_gesture = "None"
                p1, p2 = 0, 0
        else:
            current_gesture = "None"
            p1, p2 = 0, 0
        
        # Create transparent overlay with hand tracking + drawings
        overlay = np.zeros((550, 950, 4), dtype=np.uint8)  # RGBA
        
        # Add hand landmarks to overlay
        overlay[:, :, :3] = img  # Copy RGB channels
        overlay[:, :, 3] = 255  # Fully opaque for hand tracking
        
        # Blend canvas drawings
        canvas_gray = cv2.cvtColor(imgCanvas, cv2.COLOR_BGR2GRAY)
        _, canvas_mask = cv2.threshold(canvas_gray, 1, 255, cv2.THRESH_BINARY)
        
        # Apply canvas to overlay
        overlay[:, :, :3] = cv2.addWeighted(overlay[:, :, :3], 0.7, imgCanvas, 1, 0)
        overlay[:, :, 3] = np.maximum(overlay[:, :, 3], canvas_mask)  # Combine alphas
        
        # Encode as PNG to preserve transparency
        _, buffer = cv2.imencode('.png', overlay)
        frame_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return jsonify({
            'success': True,
            'frame': f'data:image/png;base64,{frame_base64}',
            'gesture': current_gesture
        })
        
    except Exception as e:
        print(f"Error processing frame: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/drawinair/stop', methods=['POST'])
def stop_drawinair():
    """Stop DrawInAir camera and reset ALL global state"""
    global camera, imgCanvas, current_gesture, p1, p2, gesture_lock_mode, gesture_lock_counter, mphands
    
    try:
        with camera_lock:
            if camera is not None:
                camera.release()
                camera = None
            
            # Close MediaPipe hands
            if mphands is not None:
                mphands.close()
                mphands = None
            
            # Reset ALL state variables
            imgCanvas = np.zeros(shape=(550, 950, 3), dtype=np.uint8)
            current_gesture = "None"
            p1, p2 = 0, 0
            gesture_lock_mode = None
            gesture_lock_counter = 0
        
        # Give camera time to fully release
        import time
        time.sleep(0.2)  # Increased to 200ms for reliable cleanup
        
        return jsonify({'success': True, 'message': 'Camera stopped and all resources released'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/drawinair/video-feed')
def video_feed():
    """Video streaming route"""
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/drawinair/gesture', methods=['GET'])
def get_current_gesture():
    """Get current hand gesture"""
    return jsonify({
        'success': True,
        'gesture': current_gesture
    })

@app.route('/api/drawinair/analyze', methods=['POST'])
def analyze_drawing():
    """
    Analyze drawn content with Gemini AI with automatic API key rotation
    Now accepts image from frontend (client-side drawing canvas)
    """
    global analysis_result
    
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({'success': False, 'error': 'No image provided'}), 400
        
        # Decode base64 image from frontend
        image_data = data['image']
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({'success': False, 'error': 'Failed to decode image'}), 400
        
        # Convert to PIL Image
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(img_rgb)
        
        try:
            # Configure Gemini API
            genai.configure(api_key=DRAWINAIR_API_KEY)
            
            print(f"🔑 Using Gemini 2.5 Flash Lite for DrawInAir vision analysis")
            
            # Analyze with Gemini 2.5 Flash Lite
            model = genai.GenerativeModel(model_name='gemini-2.5-flash-lite')
            prompt = """Analyze the image and provide the following:
* If a mathematical equation is present:
   - The equation represented in the image.
   - The solution to the equation.
   - A short explanation of the steps taken to arrive at the solution. Also it might present triangle which may have any side not given, assume mostly right angle triangle.
* If a drawing is present and no equation is detected:
   - A brief description of the drawn image in simple terms.
* If only a single text is present in the image, then just return the text only show the text only."""
            
            response = model.generate_content([prompt, pil_image])
            analysis_result = response.text
            
            return jsonify({
                'success': True,
                'result': analysis_result,
                'model_used': 'Gemini 2.5 Flash Lite'
            })
            
        except Exception as e:
            print(f"❌ Gemini API error: {e}")
            return jsonify({
                'success': False,
                'error': f'Analysis failed: {str(e)}'
            }), 500
                    
    except Exception as e:
        print(f"❌ Error in analyze endpoint: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/drawinair/clear', methods=['POST'])
def clear_canvas():
    """Clear drawing canvas"""
    global imgCanvas
    
    try:
        imgCanvas = np.zeros(shape=(550, 950, 3), dtype=np.uint8)
        return jsonify({'success': True, 'message': 'Canvas cleared'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== IMAGE READER ====================

@app.route('/api/image-reader/analyze', methods=['POST'])
def analyze_image():
    """
    Analyze uploaded image (EXACTLY like app.py)
    Uses gemini-2.5-flash-lite for better performance and higher limits
    """
    try:
        data = request.json
        image_data = data.get('imageData')
        mime_type = data.get('mimeType', 'image/jpeg')
        instructions = data.get('instructions', '')
        
        if not image_data:
            return jsonify({'error': 'No image data provided'}), 400
        
        # Decode base64 image
        image_bytes = base64.b64decode(image_data)
        
        # Create image parts for Gemini
        image_parts = [{
            "mime_type": mime_type,
            "data": image_bytes
        }]
        
        # Try with current API key, rotate on failure
        max_retries = len(IMAGE_READER_API_KEYS)
        for attempt in range(max_retries):
            try:
                api_key, key_idx = get_next_api_key('image_reader')
                genai.configure(api_key=api_key)
                
                print(f"🔑 Using Image Reader API key #{key_idx + 1}")
                
                # Analyze with Gemini 2.5 Flash Lite
                model = genai.GenerativeModel('gemini-2.5-flash-lite')
                prompt = f"Analyze the image and provide details. {instructions if instructions else 'Provide a comprehensive analysis of what you see in the image.'}"
                
                response = model.generate_content([prompt, image_parts[0]])
                
                return jsonify({
                    'success': True,
                    'result': response.text,
                    'api_key_used': key_idx + 1
                })
                
            except Exception as e:
                error_msg = str(e).lower()
                
                # Check if it's a quota/rate limit error
                if 'quota' in error_msg or 'rate' in error_msg or 'limit' in error_msg or 'exhausted' in error_msg:
                    print(f"⚠️ Image Reader API key #{key_idx + 1} exhausted: {e}")
                    rotate_api_key('image_reader')
                    
                    if attempt < max_retries - 1:
                        print(f"🔄 Retrying with next API key...")
                        continue
                    else:
                        return jsonify({
                            'success': False,
                            'error': 'All API keys exhausted. Please try again later.'
                        }), 429
                else:
                    # Not a quota error, return immediately
                    raise e
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== PLOT CRAFTER ====================

@app.route('/api/plot-crafter/generate', methods=['POST'])
def generate_plot():
    """
    Generate concise real-life example explanation (Updated approach)
    Uses gemini-2.5-flash-lite for better performance and higher limits
    Explains concepts through short, interactive real-life examples (max 1 paragraph)
    """
    try:
        data = request.json
        theme = data.get('theme')
        
        if not theme:
            return jsonify({'error': 'No theme provided'}), 400
        
        # Try with current API key, rotate on failure
        max_retries = len(PLOT_CRAFTER_API_KEYS)
        for attempt in range(max_retries):
            try:
                api_key, key_idx = get_next_api_key('plot_crafter')
                genai.configure(api_key=api_key)
                
                print(f"🔑 Using Plot Crafter API key #{key_idx + 1}")
                
                # Generate concise explanation with Gemini 2.5 Flash Lite
                model = genai.GenerativeModel('gemini-2.5-flash-lite')
                prompt = f"""Explain the concept "{theme}" using a SINGLE real-life example in simple, interactive language.

CRITICAL REQUIREMENTS:
- Use ONLY ONE PARAGRAPH (maximum 4-5 sentences)
- Explain with a relatable, everyday real-life scenario
- Use simple, conversational language that anyone can understand
- Make it interactive and engaging
- DO NOT write a long story - just one clear, concise example
- Focus on helping the user understand the concept quickly

Example format: "Imagine you're [everyday scenario]. This is exactly how [concept] works because [simple explanation]."

Topic: {theme}

Provide your ONE PARAGRAPH real-life example explanation:"""
        
                response = model.generate_content([prompt])
        
                return jsonify({
                    'success': True,
                    'result': response.text,
                    'api_key_used': f"PLOT_CRAFTER_API_KEY_{key_idx + 1 if key_idx > 0 else ''}"
                })
                
            except Exception as e:
                error_msg = str(e).lower()
                # Check if this is a quota/rate limit error
                if any(word in error_msg for word in ['quota', 'rate', 'limit', 'exhausted']):
                    print(f"⚠️ Plot Crafter API key #{key_idx + 1} exhausted: {e}")
                    rotate_api_key('plot_crafter')
                    if attempt < max_retries - 1:
                        print(f"🔄 Retrying with next Plot Crafter API key...")
                        continue
                    else:
                        print("❌ All Plot Crafter API keys exhausted!")
                        return jsonify({'error': 'All API keys exhausted. Please try again later.'}), 429
                else:
                    # Non-quota error, don't rotate
                    raise e
        
        return jsonify({'error': 'Failed to generate content'}), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== HEALTH CHECK ====================

@app.route('/api/health', methods=['GET'])
@app.route('/', methods=['GET'])
def root():
    """Root endpoint - API documentation"""
    return jsonify({
        'service': 'Magic Learn Backend API',
        'status': 'running',
        'version': '1.0.0',
        'features': ['DrawInAir', 'Image Reader', 'Plot Crafter'],
        'endpoints': {
            'health': '/health',
            'drawinair': {
                'start': 'POST /api/drawinair/start',
                'stop': 'POST /api/drawinair/stop',
                'video_feed': 'GET /api/drawinair/video-feed',
                'gesture': 'GET /api/drawinair/gesture',
                'analyze': 'POST /api/drawinair/analyze',
                'clear': 'POST /api/drawinair/clear'
            },
            'image_reader': {
                'analyze': 'POST /api/image-reader/analyze'
            },
            'plot_crafter': {
                'generate': 'POST /api/plot-crafter/generate'
            }
        }
    })

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Magic Learn Backend',
        'features': ['DrawInAir', 'Image Reader', 'Plot Crafter']
    })

# ==================== CLEANUP HANDLER ====================

def cleanup_resources():
    """Clean up camera and MediaPipe resources on shutdown"""
    global camera, mphands
    print("\\n🧹 Cleaning up resources...")
    try:
        if camera is not None:
            camera.release()
        if mphands is not None:
            mphands.close()
        print("✅ Resources cleaned up successfully")
    except Exception as e:
        print(f"⚠️ Error during cleanup: {e}")

def signal_handler(sig, frame):
    """Handle shutdown signals gracefully"""
    print("\\n🛑 Shutdown signal received. Cleaning up...")
    cleanup_resources()
    sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

if __name__ == '__main__':
    print("=" * 70)
    print("🚀 Magic Learn Backend API - Complete Implementation")
    print("=" * 70)
    print(f"📍 Server: http://localhost:5000")
    print(f"✨ Features: DrawInAir | Image Reader | Plot Crafter")
    print("-" * 70)
    print("📊 DrawInAir Endpoints:")
    print("   - POST /api/drawinair/start        - Start camera")
    print("   - POST /api/drawinair/stop         - Stop camera")
    print("   - GET  /api/drawinair/video-feed   - Video stream")
    print("   - GET  /api/drawinair/gesture      - Current gesture")
    print("   - POST /api/drawinair/analyze      - Analyze drawing")
    print("   - POST /api/drawinair/clear        - Clear canvas")
    print("-" * 70)
    print("📊 Image Reader Endpoints:")
    print("   - POST /api/image-reader/analyze   - Analyze image")
    print("-" * 70)
    print("📊 Plot Crafter Endpoints:")
    print("   - POST /api/plot-crafter/generate  - Generate plot")
    print("-" * 70)
    print("📊 General:")
    print("   - GET  /health                     - Health check")
    print("=" * 70)
    
    # Get port from environment variable (Railway sets PORT automatically)
    port = int(os.getenv('PORT', 5000))
    
    # Run WITHOUT debug mode to prevent process duplication and auto-restart issues
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True, use_reloader=False)
