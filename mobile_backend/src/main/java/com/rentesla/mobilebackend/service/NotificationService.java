package com.rentesla.mobilebackend.service;

import com.rentesla.mobilebackend.entity.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    /**
     * Send notification when document is uploaded
     */
    public void sendDocumentUploadedNotification(Long userId, Long documentId) {
        logger.info("Sending document uploaded notification to user: {} for document: {}", userId, documentId);
        // TODO: Implement FCM notification
    }

    /**
     * Send notification when document is reviewed by admin
     */
    public void sendDocumentReviewedNotification(Long userId, Long documentId, Document.DocumentStatus status) {
        logger.info("Sending document reviewed notification to user: {} for document: {} with status: {}", 
                   userId, documentId, status);
        // TODO: Implement FCM notification
    }

    /**
     * Send notification when user verification is complete
     */
    public void sendVerificationCompleteNotification(Long userId) {
        logger.info("Sending verification complete notification to user: {}", userId);
        // TODO: Implement FCM notification
    }

    /**
     * Send reservation notification
     */
    public void sendReservationNotification(Long userId, String message) {
        logger.info("Sending reservation notification to user: {}: {}", userId, message);
        // TODO: Implement FCM notification
    }

    /**
     * Send new message notification
     */
    public void sendNewMessageNotification(Long userId, Long reservationId, String senderName) {
        logger.info("Sending new message notification to user: {} for reservation: {} from: {}", 
                   userId, reservationId, senderName);
        // TODO: Implement FCM notification
    }

    /**
     * Send payment notification
     */
    public void sendPaymentNotification(Long userId, String message) {
        logger.info("Sending payment notification to user: {}: {}", userId, message);
        // TODO: Implement FCM notification
    }
} 