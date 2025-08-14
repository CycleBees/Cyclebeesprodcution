import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  Pressable,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Colors } from '@/constants/Colors';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/Styles';

interface EasterEggProps {
  isVisible: boolean;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

// Enhanced confetti piece component for top and bottom only
const ConfettiPiece = ({ color, size, startX, startY, direction }: {
  color: string;
  size: number;
  startX: number;
  startY: number;
  direction: 'top' | 'bottom';
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  // Pre-calculate random values to avoid recalculation on every render
  const randomX1 = useRef((Math.random() - 0.5) * 400).current;
  const randomX2 = useRef((Math.random() - 0.5) * 200).current;
  const randomRotate = useRef(Math.random() * 720).current;
  const randomDuration = useRef(5000 + Math.random() * 2000).current;
  const randomDelay = useRef(Math.random() * 1500).current;
  
  // Calculate end positions based on direction
  const getEndPosition = () => {
    switch (direction) {
      case 'top':
        return {
          translateY: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [startY, height + 100],
          }),
          translateX: animatedValue.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [startX, startX + randomX1, startX + randomX2],
          }),
        };
      case 'bottom':
        return {
          translateY: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [startY, -100],
          }),
          translateX: animatedValue.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [startX, startX + randomX1, startX + randomX2],
          }),
        };
    }
  };

  const { translateY, translateX } = getEndPosition();
  const rotate = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${randomRotate}deg`],
  });
  const scale = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.2, 0.8],
  });
  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [1, 1, 0],
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: randomDuration,
        useNativeDriver: true,
      }).start();
    }, randomDelay);

    return () => clearTimeout(timer);
  }, []); // Remove animatedValue from dependencies to prevent re-animation

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          backgroundColor: color,
          width: size,
          height: size,
          transform: [{ translateY }, { translateX }, { rotate }, { scale }],
          opacity,
        },
      ]}
    />
  );
};

// Example SVG component (you can replace this with your own SVG)
const EasterEggSVG = () => (
  <Svg width="120" height="120" viewBox="0 0 120 120">
    {/* Background circle */}
    <Circle cx="60" cy="60" r="55" fill="#FFD11E" stroke="#2D3E50" strokeWidth="2" />
    
    {/* Smiley face */}
    <Circle cx="45" cy="50" r="4" fill="#2D3E50" />
    <Circle cx="75" cy="50" r="4" fill="#2D3E50" />
    
    {/* Smile */}
    <Path
      d="M 35 65 Q 60 85 85 65"
      stroke="#2D3E50"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
    
    {/* Sparkles */}
    <Path
      d="M 20 30 L 25 35 L 30 30 L 25 25 Z"
      fill="#FF6B6B"
    />
    <Path
      d="M 90 25 L 95 30 L 100 25 L 95 20 Z"
      fill="#4ECDC4"
    />
    <Path
      d="M 15 80 L 20 85 L 25 80 L 20 75 Z"
      fill="#45B7D1"
    />
    <Path
      d="M 85 85 L 90 90 L 95 85 L 90 80 Z"
      fill="#96CEB4"
    />
  </Svg>
);

const EasterEgg: React.FC<EasterEggProps> = ({ isVisible, onClose }) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSVG, setShowSVG] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const svgFadeAnim = useRef(new Animated.Value(0)).current;
  const svgScaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (isVisible) {
      // Reset states
      setShowSVG(false);
      setShowConfetti(false);
      fadeAnim.setValue(0);
      svgFadeAnim.setValue(0);
      svgScaleAnim.setValue(0.8);
      
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Show confetti immediately
      setShowConfetti(true);

      // Show SVG while confetti is still playing
      const svgTimer = setTimeout(() => {
        setShowSVG(true);
        // Fade in the SVG with scale effect
        svgFadeAnim.setValue(0);
        Animated.parallel([
          Animated.timing(svgFadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(svgScaleAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start();
      }, 2000);

      // Hide everything after confetti completes (longer duration for more confetti)
      const hideTimer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }).start(() => {
          setShowSVG(false);
          setShowConfetti(false);
          onClose();
        });
      }, 8000); // Increased to 8 seconds to allow all confetti to complete

      return () => {
        clearTimeout(svgTimer);
        clearTimeout(hideTimer);
      };
    } else {
      // Reset states when not visible
      setShowConfetti(false);
      setShowSVG(false);
    }
  }, [isVisible, onClose, fadeAnim]);

  if (!isVisible) return null;

  // Generate confetti pieces from top and bottom only
  const confettiColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFE66D', '#FF8E53', '#FF9FF3', '#54A0FF', '#FF6B9D', '#00D2FF', '#FFD93D', '#6BCF7F', '#4D96FF', '#FF8A80'];
  const directions: ('top' | 'bottom')[] = ['top', 'bottom'];
  
  const confettiPieces = Array.from({ length: 300 }, (_, i) => {
    const direction = directions[Math.floor(Math.random() * directions.length)];
    let startX, startY;
    
    switch (direction) {
      case 'top':
        startX = Math.random() * width;
        startY = -40;
        break;
      case 'bottom':
        startX = Math.random() * width;
        startY = height + 40;
        break;
    }
    
    return {
      id: i,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      size: Math.random() * 15 + 4, // Smaller pieces for more density
      startX,
      startY,
      direction,
    };
  });

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="none"
      onRequestClose={() => {}} // Disable back button during animation
    >
      <Pressable 
        style={styles.overlay} 
        onPress={() => {}} // Disable tap to close during animation
        disabled={true} // Disable all interactions
      >
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          {showConfetti && (
            <View style={styles.confettiContainer}>
              {confettiPieces.map((piece) => (
                <ConfettiPiece
                  key={`${piece.id}-${isVisible}`}
                  color={piece.color}
                  size={piece.size}
                  startX={piece.startX}
                  startY={piece.startY}
                  direction={piece.direction}
                />
              ))}
            </View>
          )}
          
          {showSVG && (
            <Animated.View 
              style={[
                styles.svgContainer, 
                { 
                  opacity: svgFadeAnim,
                  transform: [{ scale: svgScaleAnim }]
                }
              ]}
            >
              <EasterEggSVG />
            </Animated.View>
          )}
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none', // Prevent interaction with confetti
  },
  confettiPiece: {
    position: 'absolute',
    borderRadius: 2,
    pointerEvents: 'none', // Prevent interaction with individual pieces
  },
  svgContainer: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
});

export default EasterEgg;