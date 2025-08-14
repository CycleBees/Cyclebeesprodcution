import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/Styles';
import { useAppTheme } from '@/hooks/useAppTheme';

interface Step {
  id: string;
  title: string;
  icon: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepPress?: (stepIndex: number) => void;
  showStepNumbers?: boolean;
}

const { width } = Dimensions.get('window');

export default function StepIndicator({
  steps,
  currentStep,
  onStepPress,
  showStepNumbers = true
}: StepIndicatorProps) {
  const { colors } = useAppTheme();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const stepAnimations = useRef(steps.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: currentStep / (steps.length - 1),
      duration: 400,
      useNativeDriver: false,
    }).start();

    // Animate current step
    stepAnimations.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: index === currentStep ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  }, [currentStep, steps.length]);

  const renderStep = (step: Step, index: number) => {
    const isCompleted = index < currentStep;
    const isCurrent = index === currentStep;
    const isUpcoming = index > currentStep;

    return (
      <Animated.View
        key={step.id}
        style={[
          styles.stepContainer,
          {
            transform: [
              {
                scale: stepAnimations[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.1],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.stepButton,
            { backgroundColor: colors.background, borderColor: colors.border },
            isCompleted && { backgroundColor: colors.success, borderColor: colors.success },
            isCurrent && { backgroundColor: colors.primary, borderColor: colors.primary },
            isUpcoming && { backgroundColor: colors.background, borderColor: colors.border },
          ]}
          onPress={() => onStepPress?.(index)}
          disabled={!onStepPress}
        >
          {isCompleted ? (
            <Ionicons name="checkmark" size={18} color={colors.background} />
          ) : (
            <Ionicons name={step.icon as any} size={18} color={isCurrent ? colors.background : colors.gray} />
          )}
        </TouchableOpacity>
        
        <Text
          style={[
            styles.stepTitle,
            { color: isCompleted ? colors.success : isCurrent ? colors.text : colors.gray },
          ]}
        >
          {step.title}
        </Text>
        
        {showStepNumbers && (
          <Text
            style={[
              styles.stepNumber,
              { color: isCompleted ? colors.success : isCurrent ? colors.text : colors.gray },
            ]}
          >
            {index + 1}
          </Text>
        )}
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <View style={styles.stepsContainer}>
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            {renderStep(step, index)}
            {index < steps.length - 1 && (
              <View style={styles.connectorContainer}>
                <View style={[styles.connector, { backgroundColor: colors.border }]} />
                <Animated.View
                  style={[
                    styles.progressBar,
                    { backgroundColor: colors.primary },
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    // backgroundColor and borderBottomColor now handled dynamically
    borderBottomWidth: 1,
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepContainer: {
    alignItems: 'center',
    flex: 1,
  },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1.5,
    // backgroundColor and borderColor now handled dynamically
  },
  // stepCompleted, stepCurrent, stepUpcoming now handled dynamically
  stepTitle: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeightSemibold,
    textAlign: 'center',
    marginBottom: 3,
    // color now handled dynamically
  },
  // stepTitleCompleted, stepTitleCurrent, stepTitleUpcoming now handled dynamically
  stepNumber: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    // color now handled dynamically
  },
  // stepNumberCompleted, stepNumberCurrent, stepNumberUpcoming now handled dynamically
  connectorContainer: {
    flex: 1,
    height: 1.5,
    marginHorizontal: 8,
    position: 'relative',
  },
  connector: {
    height: 1.5,
    // backgroundColor now handled dynamically
    borderRadius: 0.75,
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 1.5,
    // backgroundColor now handled dynamically
    borderRadius: 0.75,
  },
}); 