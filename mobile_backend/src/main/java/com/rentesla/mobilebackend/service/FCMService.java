package com.rentesla.mobilebackend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.*;
import com.rentesla.mobilebackend.entity.Notification;
import com.rentesla.mobilebackend.entity.User;
import com.rentesla.mobilebackend.repository.NotificationRepository;
import com.rentesla.mobilebackend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.FileInputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
public class FCMService {

    private static final Logger logger = LoggerFactory.getLogger(FCMService.class);

    @Value("${firebase.config.path:classpath:firebase-adminsdk.json}")
    private String firebaseConfigPath;

    @Value("${firebase.enabled:true}")
    private boolean firebaseEnabled;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private MessageService messageService;

    private FirebaseApp firebaseApp;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostConstruct
    public void initialize() {
        if (!firebaseEnabled) {
            logger.warn("📵 Firebase FCM is disabled. Notifications will only be logged.");
            return;
        }

        try {
            logger.info("🔥 Initializing Firebase Admin SDK...");

            // Check if Firebase app is already initialized
            if (FirebaseApp.getApps().isEmpty()) {
                // Try to load from classpath resource first
                try (var inputStream = new ClassPathResource("firebase-adminsdk.json").getInputStream()) {
                    FirebaseOptions options = FirebaseOptions.builder()
                            .setCredentials(com.google.auth.oauth2.GoogleCredentials.fromStream(inputStream))
                            .build();

                    firebaseApp = FirebaseApp.initializeApp(options);
                    logger.info("✅ Firebase Admin SDK initialized successfully from classpath");
                } catch (Exception e) {
                    logger.warn("⚠️ Could not load firebase config from classpath, trying file path: {}", firebaseConfigPath);
                    
                    // Fallback to file path
                    if (!firebaseConfigPath.startsWith("classpath:")) {
                        try (var inputStream = new FileInputStream(firebaseConfigPath)) {
                            FirebaseOptions options = FirebaseOptions.builder()
                                    .setCredentials(com.google.auth.oauth2.GoogleCredentials.fromStream(inputStream))
                                    .build();

                            firebaseApp = FirebaseApp.initializeApp(options);
                            logger.info("✅ Firebase Admin SDK initialized successfully from file");
                        }
                    } else {
                        throw e;
                    }
                }
            } else {
                firebaseApp = FirebaseApp.getInstance();
                logger.info("✅ Firebase Admin SDK already initialized");
            }

        } catch (Exception e) {
            logger.error("❌ Failed to initialize Firebase Admin SDK: {}", e.getMessage());
            logger.warn("📵 FCM notifications will be disabled. Only console logging will be used.");
            firebaseEnabled = false;
        }
    }

    /**
     * Send notification to specific user
     */
    public CompletableFuture<String> sendToUser(Long userId, String title, String body, Map<String, String> data, String notificationType) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                logger.info("📤 Sending notification to user {}: {}", userId, title);

                // Get user and FCM token
                User user = userRepository.findById(userId).orElse(null);
                if (user == null) {
                    logger.error("❌ User not found: {}", userId);
                    return null;
                }

                if (user.getFcmToken() == null || user.getFcmToken().trim().isEmpty()) {
                    logger.warn("⚠️ User {} has no FCM token. Notification will be logged only.", userId);
                    return logNotificationOnly(userId, title, body, data, notificationType);
                }

                // Create notification record
                Notification notification = createNotificationRecord(userId, title, body, data, notificationType);

                if (!firebaseEnabled || firebaseApp == null) {
                    logger.warn("📵 Firebase not available. Logging notification only.");
                    return logNotificationOnly(userId, title, body, data, notificationType);
                }

                // Build FCM message
                Message message = Message.builder()
                        .setToken(user.getFcmToken())
                        .setNotification(com.google.firebase.messaging.Notification.builder()
                                .setTitle(title)
                                .setBody(body)
                                .build())
                        .putAllData(data != null ? data : new HashMap<>())
                        .setAndroidConfig(AndroidConfig.builder()
                                .setNotification(AndroidNotification.builder()
                                        .setClickAction("FLUTTER_NOTIFICATION_CLICK")
                                        .setChannelId("rentesla_notifications")
                                        .setPriority(AndroidNotification.Priority.HIGH)
                                        .build())
                                .build())
                        .setApnsConfig(ApnsConfig.builder()
                                .setAps(Aps.builder()
                                        .setAlert(ApsAlert.builder()
                                                .setTitle(title)
                                                .setBody(body)
                                                .build())
                                        .setSound("default")
                                        .setBadge(1)
                                        .build())
                                .build())
                        .build();

                // Send message
                String messageId = FirebaseMessaging.getInstance(firebaseApp).send(message);
                
                // Update notification as delivered
                notification.markAsDelivered(messageId);
                notificationRepository.save(notification);

                logger.info("✅ FCM notification sent successfully to user {}: {}", userId, messageId);
                return messageId;

            } catch (Exception e) {
                logger.error("❌ Failed to send FCM notification to user {}: {}", userId, e.getMessage());
                
                // Save error to notification record
                Notification notification = createNotificationRecord(userId, title, body, data, notificationType);
                notification.markAsError(e.getMessage());
                notificationRepository.save(notification);
                
                return null;
            }
        });
    }

    /**
     * Send notification to all admin users
     */
    public void sendToAdmins(String title, String body, Map<String, String> data, String notificationType) {
        logger.info("📢 Sending notification to all admin users: {}", title);

        List<User> adminUsers = userRepository.findByRole(User.UserRole.ADMIN);
        if (adminUsers.isEmpty()) {
            logger.warn("⚠️ No admin users found to send notification");
            return;
        }

        List<Long> adminUserIds = adminUsers.stream()
                .map(User::getId)
                .collect(Collectors.toList());

        sendToMultipleUsers(adminUserIds, title, body, data, notificationType);
    }

    /**
     * Send notification to multiple users
     */
    public void sendToMultipleUsers(List<Long> userIds, String title, String body, Map<String, String> data, String notificationType) {
        if (userIds == null || userIds.isEmpty()) {
            logger.warn("⚠️ No users provided for batch notification");
            return;
        }

        logger.info("📤 Sending batch notification to {} users: {}", userIds.size(), title);

        // Send to each user asynchronously
        List<CompletableFuture<String>> futures = userIds.stream()
                .map(userId -> sendToUser(userId, title, body, data, notificationType))
                .collect(Collectors.toList());

        // Wait for all to complete
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                .thenRun(() -> {
                    long successCount = futures.stream()
                            .map(CompletableFuture::join)
                            .filter(result -> result != null)
                            .count();
                    
                    logger.info("✅ Batch notification completed: {}/{} sent successfully", successCount, userIds.size());
                });
    }

    /**
     * Update user FCM token
     */
    public void updateUserFCMToken(Long userId, String token) {
        try {
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                logger.error("❌ User not found for FCM token update: {}", userId);
                return;
            }

            user.setFcmToken(token);
            userRepository.save(user);

            logger.info("🔄 FCM token updated for user {}: {}...{}", 
                    userId, 
                    token.length() > 10 ? token.substring(0, 10) : token,
                    token.length() > 10 ? token.substring(token.length() - 10) : "");

        } catch (Exception e) {
            logger.error("❌ Failed to update FCM token for user {}: {}", userId, e.getMessage());
        }
    }

    /**
     * Remove FCM token (user logout)
     */
    public void removeUserFCMToken(Long userId) {
        try {
            User user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                user.setFcmToken(null);
                userRepository.save(user);
                logger.info("🗑️ FCM token removed for user {}", userId);
            }
        } catch (Exception e) {
            logger.error("❌ Failed to remove FCM token for user {}: {}", userId, e.getMessage());
        }
    }

    /**
     * Create notification record in database
     */
    private Notification createNotificationRecord(Long userId, String title, String body, Map<String, String> data, String type) {
        try {
            String dataJson = data != null ? objectMapper.writeValueAsString(data) : null;
            Notification notification = new Notification(userId, title, body, dataJson, type);
            return notificationRepository.save(notification);
        } catch (Exception e) {
            logger.error("❌ Failed to create notification record: {}", e.getMessage());
            return new Notification(userId, title, body, type);
        }
    }

    /**
     * Log notification only (when FCM is not available)
     */
    private String logNotificationOnly(Long userId, String title, String body, Map<String, String> data, String type) {
        logger.info("📋 NOTIFICATION LOG - User: {}, Title: {}, Body: {}, Data: {}", userId, title, body, data);
        
        // Still create notification record for tracking
        Notification notification = createNotificationRecord(userId, title, body, data, type);
        notification.setDelivered(false);
        notification.setErrorMessage("FCM not available - logged only");
        notificationRepository.save(notification);
        
        return "logged_only";
    }

    /**
     * Get notification statistics
     */
    public Map<String, Object> getNotificationStatistics(int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        List<Object[]> stats = notificationRepository.getNotificationStatistics(since);
        
        Map<String, Object> result = new HashMap<>();
        for (Object[] stat : stats) {
            String type = (String) stat[0];
            Long total = (Long) stat[1];
            Long delivered = (Long) stat[2];
            Long opened = (Long) stat[3];
            
            Map<String, Object> typeStats = new HashMap<>();
            typeStats.put("total", total);
            typeStats.put("delivered", delivered);
            typeStats.put("opened", opened);
            typeStats.put("deliveryRate", total > 0 ? (delivered * 100.0 / total) : 0);
            typeStats.put("openRate", delivered > 0 ? (opened * 100.0 / delivered) : 0);
            
            result.put(type, typeStats);
        }
        
        return result;
    }

    /**
     * Retry failed notifications
     */
    public void retryFailedNotifications() {
        if (!firebaseEnabled) {
            logger.info("📵 FCM disabled, skipping retry");
            return;
        }

        List<Notification> failedNotifications = notificationRepository.findNotificationsForRetry(3);
        logger.info("🔄 Retrying {} failed notifications", failedNotifications.size());

        for (Notification notification : failedNotifications) {
            Map<String, String> data = null;
            try {
                if (notification.getData() != null) {
                    data = objectMapper.readValue(notification.getData(), HashMap.class);
                }
            } catch (Exception e) {
                logger.warn("⚠️ Failed to parse notification data for retry: {}", e.getMessage());
            }

            sendToUser(notification.getUserId(), notification.getTitle(), notification.getBody(), data, notification.getType());
        }
    }
} 
 