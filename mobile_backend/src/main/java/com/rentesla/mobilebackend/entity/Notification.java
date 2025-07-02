package com.rentesla.mobilebackend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @NotBlank
    @Size(max = 255)
    @Column(name = "title", nullable = false)
    private String title;

    @NotBlank
    @Column(name = "body", nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "data", columnDefinition = "JSON")
    private String data;

    @NotBlank
    @Size(max = 50)
    @Column(name = "type", nullable = false)
    private String type;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt = LocalDateTime.now();

    @Column(name = "delivered", nullable = false)
    private Boolean delivered = false;

    @Column(name = "opened", nullable = false)
    private Boolean opened = false;

    @Size(max = 255)
    @Column(name = "fcm_message_id")
    private String fcmMessageId;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "retry_count", nullable = false)
    private Integer retryCount = 0;

    // Constructors
    public Notification() {}

    public Notification(Long userId, String title, String body, String type) {
        this.userId = userId;
        this.title = title;
        this.body = body;
        this.type = type;
        this.sentAt = LocalDateTime.now();
        this.delivered = false;
        this.opened = false;
        this.retryCount = 0;
    }

    public Notification(Long userId, String title, String body, String data, String type) {
        this(userId, title, body, type);
        this.data = data;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public String getData() {
        return data;
    }

    public void setData(String data) {
        this.data = data;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public LocalDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(LocalDateTime sentAt) {
        this.sentAt = sentAt;
    }

    public Boolean getDelivered() {
        return delivered;
    }

    public void setDelivered(Boolean delivered) {
        this.delivered = delivered;
    }

    public Boolean getOpened() {
        return opened;
    }

    public void setOpened(Boolean opened) {
        this.opened = opened;
    }

    public String getFcmMessageId() {
        return fcmMessageId;
    }

    public void setFcmMessageId(String fcmMessageId) {
        this.fcmMessageId = fcmMessageId;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public Integer getRetryCount() {
        return retryCount;
    }

    public void setRetryCount(Integer retryCount) {
        this.retryCount = retryCount;
    }

    // Utility methods
    public void markAsDelivered(String messageId) {
        this.delivered = true;
        this.fcmMessageId = messageId;
        this.sentAt = LocalDateTime.now();
    }

    public void markAsError(String errorMessage) {
        this.delivered = false;
        this.errorMessage = errorMessage;
        this.retryCount = (this.retryCount != null) ? this.retryCount + 1 : 1;
    }

    public void markAsOpened() {
        this.opened = true;
    }

    /**
     * Notification type constants
     */
    public static class Type {
        public static final String DOCUMENT_UPLOADED = "DOCUMENT_UPLOADED";
        public static final String DOCUMENT_APPROVED = "DOCUMENT_APPROVED";
        public static final String DOCUMENT_REJECTED = "DOCUMENT_REJECTED";
        public static final String DOCUMENT_NEEDS_REVIEW = "DOCUMENT_NEEDS_REVIEW";
        public static final String VERIFICATION_COMPLETE = "VERIFICATION_COMPLETE";
        public static final String ADMIN_REVIEW_NEEDED = "ADMIN_REVIEW_NEEDED";
        public static final String RESERVATION_CREATED = "RESERVATION_CREATED";
        public static final String RESERVATION_UPDATED = "RESERVATION_UPDATED";
        public static final String RESERVATION_CANCELLED = "RESERVATION_CANCELLED";
        public static final String PAYMENT_SUCCESS = "PAYMENT_SUCCESS";
        public static final String PAYMENT_FAILED = "PAYMENT_FAILED";
        public static final String NEW_MESSAGE = "NEW_MESSAGE";
        public static final String SYSTEM_ANNOUNCEMENT = "SYSTEM_ANNOUNCEMENT";
        public static final String PROMOTIONAL = "PROMOTIONAL";
    }

    @Override
    public String toString() {
        return "Notification{" +
                "id=" + id +
                ", userId=" + userId +
                ", title='" + title + '\'' +
                ", type='" + type + '\'' +
                ", delivered=" + delivered +
                ", opened=" + opened +
                ", sentAt=" + sentAt +
                '}';
    }
} 
 