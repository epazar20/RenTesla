package com.rentesla.mobilebackend.service;

import com.rentesla.mobilebackend.entity.Document;
import com.rentesla.mobilebackend.entity.Notification;
import com.rentesla.mobilebackend.entity.User;
import com.rentesla.mobilebackend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@Service
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    @Autowired
    private FCMService fcmService;

    @Autowired
    private MessageService messageService;

    @Autowired
    private UserRepository userRepository;

    /**
     * Send notification when document is uploaded
     */
    public void sendDocumentUploadedNotification(Long userId, Long documentId) {
        logger.info("📤 Sending document uploaded notification to user: {} for document: {}", userId, documentId);
        
        try {
            String title = messageService.getMessage("notification.document.uploaded.title");
            String body = messageService.getMessage("notification.document.uploaded.body");
            
            Map<String, String> data = new HashMap<>();
            data.put("type", Notification.Type.DOCUMENT_UPLOADED);
            data.put("documentId", documentId.toString());
            data.put("userId", userId.toString());
            data.put("action", "document_uploaded");
            
            fcmService.sendToUser(userId, title, body, data, Notification.Type.DOCUMENT_UPLOADED);
            logger.info("✅ Document uploaded notification sent to user: {}", userId);
            
        } catch (Exception e) {
            logger.error("❌ Failed to send document uploaded notification: {}", e.getMessage());
        }
    }

    /**
     * Send notification when document is reviewed by admin
     */
    public void sendDocumentReviewedNotification(Long userId, Long documentId, Document.DocumentStatus status) {
        logger.info("📤 Sending document reviewed notification to user: {} for document: {} with status: {}", 
                   userId, documentId, status);
        
        try {
            String title;
            String body;
            String notificationType;
            
            if (status == Document.DocumentStatus.APPROVED) {
                title = messageService.getMessage("notification.document.approved.title");
                body = messageService.getMessage("notification.document.approved.body");
                notificationType = Notification.Type.DOCUMENT_APPROVED;
            } else if (status == Document.DocumentStatus.REJECTED) {
                title = messageService.getMessage("notification.document.rejected.title");
                body = messageService.getMessage("notification.document.rejected.body");
                notificationType = Notification.Type.DOCUMENT_REJECTED;
            } else {
                logger.warn("⚠️ Unknown document status for notification: {}", status);
                return;
            }
            
            Map<String, String> data = new HashMap<>();
            data.put("type", notificationType);
            data.put("documentId", documentId.toString());
            data.put("userId", userId.toString());
            data.put("status", status.name());
            data.put("action", "document_reviewed");
            
            fcmService.sendToUser(userId, title, body, data, notificationType);
            logger.info("✅ Document reviewed notification sent to user: {}", userId);
            
        } catch (Exception e) {
            logger.error("❌ Failed to send document reviewed notification: {}", e.getMessage());
        }
    }

    /**
     * Send notification when user verification is complete
     */
    public void sendVerificationCompleteNotification(Long userId) {
        logger.info("🎉 Sending verification complete notification to user: {}", userId);
        
        try {
            String title = messageService.getMessage("notification.verification.complete.title");
            String body = messageService.getMessage("notification.verification.complete.body");
            
            Map<String, String> data = new HashMap<>();
            data.put("type", Notification.Type.VERIFICATION_COMPLETE);
            data.put("userId", userId.toString());
            data.put("action", "verification_complete");
            
            fcmService.sendToUser(userId, title, body, data, Notification.Type.VERIFICATION_COMPLETE);
            logger.info("✅ Verification complete notification sent to user: {}", userId);
            
        } catch (Exception e) {
            logger.error("❌ Failed to send verification complete notification: {}", e.getMessage());
        }
    }

    /**
     * Send notification to user when document needs manual review
     */
    public void sendDocumentNeedsReviewNotification(Long documentId) {
        logger.info("📤 Sending document needs review notification for document: {}", documentId);
        
        try {
            // This method was previously sending to admins, but based on the method name,
            // it should send to the user whose document needs review
            // We'll implement both scenarios with separate methods
            
        } catch (Exception e) {
            logger.error("❌ Failed to send document needs review notification: {}", e.getMessage());
        }
    }

    /**
     * Send notification to user when their document needs manual review
     */
    public void sendDocumentNeedsReviewToUser(Long userId, Long documentId) {
        logger.info("📤 Sending document needs review notification to user: {} for document: {}", userId, documentId);
        
        try {
            String title = messageService.getMessage("notification.document.needs.review.user.title");
            String body = messageService.getMessage("notification.document.needs.review.user.body");
            
            Map<String, String> data = new HashMap<>();
            data.put("type", Notification.Type.DOCUMENT_NEEDS_REVIEW);
            data.put("documentId", documentId.toString());
            data.put("userId", userId.toString());
            data.put("action", "document_needs_review");
            
            fcmService.sendToUser(userId, title, body, data, Notification.Type.DOCUMENT_NEEDS_REVIEW);
            logger.info("✅ Document needs review notification sent to user: {}", userId);
            
        } catch (Exception e) {
            logger.error("❌ Failed to send document needs review notification to user: {}", e.getMessage());
        }
    }

    /**
     * Send notification to admins when document needs manual review
     */
    public void sendDocumentNeedsReviewToAdmins(Long documentId, Long userId) {
        logger.info("📢 Sending document needs review notification to admins for document: {} from user: {}", documentId, userId);
        
        try {
            User user = userRepository.findById(userId).orElse(null);
            String userName = (user != null) ? user.getFullName() : "User #" + userId;
            
            String title = messageService.getMessage("notification.admin.document.review.title");
            String body = messageService.getMessage("notification.admin.document.review.body", new Object[]{userName});
            
            Map<String, String> data = new HashMap<>();
            data.put("type", Notification.Type.ADMIN_REVIEW_NEEDED);
            data.put("documentId", documentId.toString());
            data.put("userId", userId.toString());
            data.put("userName", userName);
            data.put("action", "admin_review_needed");
            
            fcmService.sendToAdmins(title, body, data, Notification.Type.ADMIN_REVIEW_NEEDED);
            logger.info("✅ Admin review notification sent for document: {}", documentId);
            
        } catch (Exception e) {
            logger.error("❌ Failed to send admin review notification: {}", e.getMessage());
        }
    }

    /**
     * Send notification to user about document processing status
     */
    public void sendDocumentProcessingNotification(Long userId, Long documentId, String status, String message) {
        logger.info("📤 Sending document processing notification to user: {} for document: {} with status: {} - {}", 
                   userId, documentId, status, message);
        
        try {
            String title = messageService.getMessage("notification.document.processing.title");
            String body = message;
            
            Map<String, String> data = new HashMap<>();
            data.put("type", "DOCUMENT_PROCESSING");
            data.put("documentId", documentId.toString());
            data.put("userId", userId.toString());
            data.put("status", status);
            data.put("action", "document_processing");
            
            fcmService.sendToUser(userId, title, body, data, "DOCUMENT_PROCESSING");
            logger.info("✅ Document processing notification sent to user: {}", userId);
            
        } catch (Exception e) {
            logger.error("❌ Failed to send document processing notification: {}", e.getMessage());
        }
    }

    /**
     * Send notification to admin about new document upload
     */
    public void sendNewDocumentUploadNotification(Long documentId, Long userId) {
        logger.info("📢 Sending new document upload notification to admins for document: {} from user: {}", 
                   documentId, userId);
        
        try {
            User user = userRepository.findById(userId).orElse(null);
            String userName = (user != null) ? user.getFullName() : "User #" + userId;
            
            String title = messageService.getMessage("notification.admin.document.upload.title");
            String body = messageService.getMessage("notification.admin.document.upload.body", new Object[]{userName});
            
            Map<String, String> data = new HashMap<>();
            data.put("type", "NEW_DOCUMENT_UPLOAD");
            data.put("documentId", documentId.toString());
            data.put("userId", userId.toString());
            data.put("userName", userName);
            data.put("action", "new_document_upload");
            
            fcmService.sendToAdmins(title, body, data, "NEW_DOCUMENT_UPLOAD");
            logger.info("✅ New document upload notification sent to admins");
            
        } catch (Exception e) {
            logger.error("❌ Failed to send new document upload notification: {}", e.getMessage());
        }
    }

    /**
     * Send batch notification to admins about pending documents
     */
    public void sendPendingDocumentsSummaryNotification(int pendingCount) {
        logger.info("📢 Sending pending documents summary notification to admins: {} pending documents", pendingCount);
        
        try {
            String title = messageService.getMessage("notification.admin.pending.documents.title");
            String body = messageService.getMessage("notification.admin.pending.documents.body", new Object[]{pendingCount});
            
            Map<String, String> data = new HashMap<>();
            data.put("type", "PENDING_DOCUMENTS_SUMMARY");
            data.put("pendingCount", String.valueOf(pendingCount));
            data.put("action", "pending_documents_summary");
            
            fcmService.sendToAdmins(title, body, data, "PENDING_DOCUMENTS_SUMMARY");
            logger.info("✅ Pending documents summary notification sent to admins");
            
        } catch (Exception e) {
            logger.error("❌ Failed to send pending documents summary notification: {}", e.getMessage());
        }
    }

    /**
     * Send reservation notification
     */
    public void sendReservationNotification(Long userId, String message) {
        logger.info("📤 Sending reservation notification to user: {}: {}", userId, message);
        
        try {
            String title = messageService.getMessage("notification.reservation.title");
            String body = message;
            
            Map<String, String> data = new HashMap<>();
            data.put("type", Notification.Type.RESERVATION_CREATED);
            data.put("userId", userId.toString());
            data.put("action", "reservation_update");
            
            fcmService.sendToUser(userId, title, body, data, Notification.Type.RESERVATION_CREATED);
            logger.info("✅ Reservation notification sent to user: {}", userId);
            
        } catch (Exception e) {
            logger.error("❌ Failed to send reservation notification: {}", e.getMessage());
        }
    }

    /**
     * Send new message notification
     */
    public void sendNewMessageNotification(Long userId, Long reservationId, String senderName) {
        logger.info("📤 Sending new message notification to user: {} for reservation: {} from: {}", 
                   userId, reservationId, senderName);
        
        try {
            String title = messageService.getMessage("notification.new.message.title");
            String body = messageService.getMessage("notification.new.message.body", new Object[]{senderName});
            
            Map<String, String> data = new HashMap<>();
            data.put("type", Notification.Type.NEW_MESSAGE);
            data.put("userId", userId.toString());
            data.put("reservationId", reservationId.toString());
            data.put("senderName", senderName);
            data.put("action", "new_message");
            
            fcmService.sendToUser(userId, title, body, data, Notification.Type.NEW_MESSAGE);
            logger.info("✅ New message notification sent to user: {}", userId);
            
        } catch (Exception e) {
            logger.error("❌ Failed to send new message notification: {}", e.getMessage());
        }
    }

    /**
     * Send payment notification
     */
    public void sendPaymentNotification(Long userId, String message) {
        logger.info("📤 Sending payment notification to user: {}: {}", userId, message);
        
        try {
            String title = messageService.getMessage("notification.payment.title");
            String body = message;
            
            Map<String, String> data = new HashMap<>();
            data.put("type", Notification.Type.PAYMENT_SUCCESS);
            data.put("userId", userId.toString());
            data.put("action", "payment_update");
            
            fcmService.sendToUser(userId, title, body, data, Notification.Type.PAYMENT_SUCCESS);
            logger.info("✅ Payment notification sent to user: {}", userId);
            
        } catch (Exception e) {
            logger.error("❌ Failed to send payment notification: {}", e.getMessage());
        }
    }

    /**
     * Send notification when document is approved (with detailed scenarios)
     */
    public void sendDocumentApprovedNotification(Long userId, Long documentId) {
        sendDocumentApprovedNotification(userId, documentId, false, null);
    }

    /**
     * Send notification when document is approved with additional context
     */
    public void sendDocumentApprovedNotification(Long userId, Long documentId, boolean autoApproved, Long reviewedBy) {
        try {
            logger.info("📬 Sending document approved notification to user: {} for document: {} (auto: {})", 
                       userId, documentId, autoApproved);
            
            String title;
            String body;
            
            if (autoApproved) {
                title = messageService.getMessage("notification.document.auto.approved.title");
                body = messageService.getMessage("notification.document.auto.approved.body");
            } else {
                title = messageService.getMessage("notification.document.manual.approved.title");
                body = messageService.getMessage("notification.document.manual.approved.body");
            }
            
            Map<String, String> data = new HashMap<>();
            data.put("type", Notification.Type.DOCUMENT_APPROVED);
            data.put("documentId", documentId.toString());
            data.put("userId", userId.toString());
            data.put("autoApproved", String.valueOf(autoApproved));
            if (reviewedBy != null) {
                data.put("reviewedBy", reviewedBy.toString());
            }
            data.put("action", "document_approved");
            
            fcmService.sendToUser(userId, title, body, data, Notification.Type.DOCUMENT_APPROVED);
            logger.info("✅ Document approved notification sent successfully to user: {}", userId);
            
        } catch (Exception e) {
            logger.error("❌ Failed to send document approved notification: {}", e.getMessage());
        }
    }
    
    /**
     * Send notification when document is rejected
     */
    public void sendDocumentRejectedNotification(Long userId, Long documentId, String reason) {
        try {
            logger.info("📬 Sending document rejected notification to user: {} for document: {}", userId, documentId);
            
            String title = messageService.getMessage("notification.document.rejected.title");
            String body = messageService.getMessage("notification.document.rejected.body", new Object[]{reason});
            
            Map<String, String> data = new HashMap<>();
            data.put("type", Notification.Type.DOCUMENT_REJECTED);
            data.put("documentId", documentId.toString());
            data.put("userId", userId.toString());
            data.put("reason", reason != null ? reason : "");
            data.put("action", "document_rejected");
            
            fcmService.sendToUser(userId, title, body, data, Notification.Type.DOCUMENT_REJECTED);
            logger.info("✅ Document rejected notification sent successfully to user: {}", userId);
            
        } catch (Exception e) {
            logger.error("❌ Failed to send document rejected notification: {}", e.getMessage());
        }
    }
    
    /**
     * Send notification to admin for manual document review
     */
    public void sendAdminReviewNotification(Long documentId, String reason) {
        try {
            logger.info("📢 Sending admin review notification for document: {} (reason: {})", documentId, reason);
            
            String title = messageService.getMessage("notification.admin.review.needed.title");
            String body = messageService.getMessage("notification.admin.review.needed.body", new Object[]{documentId, reason});
            
            Map<String, String> data = new HashMap<>();
            data.put("type", Notification.Type.ADMIN_REVIEW_NEEDED);
            data.put("documentId", documentId.toString());
            data.put("reason", reason != null ? reason : "");
            data.put("action", "admin_review_needed");
            
            fcmService.sendToAdmins(title, body, data, Notification.Type.ADMIN_REVIEW_NEEDED);
            logger.info("✅ Admin review notification sent successfully for document: {}", documentId);
            
        } catch (Exception e) {
            logger.error("❌ Failed to send admin review notification: {}", e.getMessage());
        }
    }

    /**
     * Update FCM token for user
     */
    public void updateUserFCMToken(Long userId, String token) {
        fcmService.updateUserFCMToken(userId, token);
    }

    /**
     * Remove FCM token for user (logout)
     */
    public void removeUserFCMToken(Long userId) {
        fcmService.removeUserFCMToken(userId);
    }

    /**
     * Get notification statistics
     */
    public Map<String, Object> getNotificationStatistics(int days) {
        // Implementation
        return new HashMap<>();
    }
} 