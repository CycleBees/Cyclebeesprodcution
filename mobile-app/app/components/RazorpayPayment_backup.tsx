import React, { useState, useRef } from 'react';
import { View, Modal, StyleSheet, Alert, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config/api';

interface RazorpayPaymentProps {
    visible: boolean;
    amount: number;
    requestType: 'repair' | 'rental';
    requestId?: number;
    onSuccess: (paymentData: any) => void;
    onFailure: (error: string) => void;
    onClose: () => void;
    theme: any;
}

interface PaymentResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

const RazorpayPayment: React.FC<RazorpayPaymentProps> = ({
    visible,
    amount,
    requestType,
    requestId,
    onSuccess,
    onFailure,
    onClose,
    theme
}) => {
    const [loading, setLoading] = useState(false);
    const [webViewUrl, setWebViewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const webViewRef = useRef<WebView>(null);

    const createOrder = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const response = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount,
                    currency: 'INR',
                    request_type: requestType,
                    ...(requestId && { request_id: requestId })
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to create payment order');
            }

            // Create the Razorpay checkout HTML
            const checkoutHtml = createCheckoutHtml(data.data);
            const htmlUri = `data:text/html;charset=utf-8,${encodeURIComponent(checkoutHtml)}`;
            setWebViewUrl(htmlUri);

        } catch (error) {
            console.error('Error creating order:', error);
            setError(error instanceof Error ? error.message : 'Failed to create payment order');
            onFailure(error instanceof Error ? error.message : 'Failed to create payment order');
        } finally {
            setLoading(false);
        }
    };

    const createCheckoutHtml = (orderData: any) => {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Razorpay Payment</title>
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
            width: 100%;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #3b82f6;
            margin-bottom: 20px;
        }
        .amount {
            font-size: 32px;
            font-weight: bold;
            color: #1f2937;
            margin: 20px 0;
        }
        .description {
            color: #6b7280;
            margin-bottom: 30px;
            line-height: 1.5;
        }
        .button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: background 0.2s;
        }
        .button:hover {
            background: #2563eb;
        }
        .button:disabled {
            background: #9ca3af;
            cursor: not-allowed;
        }
        .secure {
            margin-top: 20px;
            color: #6b7280;
            font-size: 12px;
        }
        .loading {
            display: none;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-top: 20px;
        }
        .spinner {
            border: 2px solid #e5e7eb;
            border-top: 2px solid #3b82f6;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">CycleBees</div>
        <div class="amount">₹${(orderData.amount / 100).toFixed(2)}</div>
        <div class="description">
            Service charge payment for ${requestType} request
            <br>
            <small>Order ID: ${orderData.order_id}</small>
        </div>
        <button id="payButton" class="button" onclick="startPayment()">
            Pay Now
        </button>
        <div id="loading" class="loading">
            <div class="spinner"></div>
            <span>Processing payment...</span>
        </div>
        <div class="secure">
            🔒 Secured by Razorpay
        </div>
    </div>

    <script>
        const orderData = ${JSON.stringify(orderData)};
        
        function startPayment() {
            const payButton = document.getElementById('payButton');
            const loading = document.getElementById('loading');
            
            payButton.disabled = true;
            payButton.style.display = 'none';
            loading.style.display = 'flex';
            
            const options = {
                "key": orderData.key,
                "amount": orderData.amount,
                "currency": orderData.currency,
                "name": "CycleBees",
                "description": "Service charge for ${requestType} request",
                "order_id": orderData.order_id,
                "handler": function (response) {
                    // Send success message to React Native
                    window.ReactNativeWebView?.postMessage(JSON.stringify({
                        type: 'payment_success',
                        data: response
                    }));
                },
                "prefill": {
                    "name": "",
                    "email": "",
                    "contact": ""
                },
                "theme": {
                    "color": "#3b82f6"
                },
                "modal": {
                    "ondismiss": function() {
                        // Send cancel message to React Native
                        window.ReactNativeWebView?.postMessage(JSON.stringify({
                            type: 'payment_cancelled',
                            data: { message: 'Payment cancelled by user' }
                        }));
                    }
                }
            };
            
            const rzp = new Razorpay(options);
            
            rzp.on('payment.failed', function (response) {
                // Send failure message to React Native
                window.ReactNativeWebView?.postMessage(JSON.stringify({
                    type: 'payment_failed',
                    data: response.error
                }));
            });
            
            rzp.open();
        }
        
        // Auto-start payment when page loads
        window.onload = function() {
            setTimeout(startPayment, 1000);
        };
    </script>
</body>
</html>`;
    };

    const handleWebViewMessage = async (event: any) => {
        try {
            const message = JSON.parse(event.nativeEvent.data);
            
            switch (message.type) {
                case 'payment_success':
                    await verifyPayment(message.data);
                    break;
                    
                case 'payment_failed':
                    onFailure(`Payment failed: ${message.data.description || 'Unknown error'}`);
                    break;
                    
                case 'payment_cancelled':
                    onFailure('Payment was cancelled');
                    break;
                    
                default:
                    console.log('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error handling WebView message:', error);
            onFailure('Error processing payment response');
        }
    };

    const verifyPayment = async (paymentData: PaymentResponse) => {
        try {
            setLoading(true);
            
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const response = await fetch(`${API_BASE_URL}/api/payment/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(paymentData)
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Payment verification failed');
            }

            // Payment verified successfully
            onSuccess({
                ...paymentData,
                verificationData: data.data,
                transactionId: data.data.transaction_id
            });

        } catch (error) {
            console.error('Error verifying payment:', error);
            onFailure(error instanceof Error ? error.message : 'Payment verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setWebViewUrl(null);
        setError(null);
        onClose();
    };

    // Start payment flow when modal opens
    React.useEffect(() => {
        if (visible && !webViewUrl && !loading && !error) {
            createOrder();
        }
    }, [visible]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                        Payment
                    </Text>
                    <View style={styles.closeButton} />
                </View>

                {/* Content */}
                <View style={styles.content}>
                    {loading && !webViewUrl && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                            <Text style={[styles.loadingText, { color: theme.colors.text }]}>
                                Preparing payment...
                            </Text>
                        </View>
                    )}

                    {error && (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
                            <Text style={[styles.errorText, { color: theme.colors.error }]}>
                                {error}
                            </Text>
                            <TouchableOpacity 
                                style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
                                onPress={createOrder}
                            >
                                <Text style={styles.retryButtonText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {webViewUrl && (
                        <WebView
                            ref={webViewRef}
                            source={{ uri: webViewUrl }}
                            style={styles.webview}
                            onMessage={handleWebViewMessage}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            startInLoadingState={true}
                            renderLoading={() => (
                                <View style={styles.webviewLoading}>
                                    <ActivityIndicator size="large" color={theme.colors.primary} />
                                </View>
                            )}
                            onError={(error) => {
                                console.error('WebView error:', error);
                                setError('Failed to load payment page');
                            }}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        paddingTop: 50, // Account for status bar
    },
    closeButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        paddingHorizontal: 32,
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 16,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    webview: {
        flex: 1,
    },
    webviewLoading: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
    },
});

export default RazorpayPayment;