package com.rentesla.mobilebackend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "documents")
public class Document extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private DocumentType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "face")
    private DocumentFace face;

    @Column(name = "data", columnDefinition = "TEXT")
    private String data; // JSON format for extracted OCR data

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private DocumentStatus status = DocumentStatus.PENDING;

    @Column(name = "image_base64", columnDefinition = "LONGTEXT")
    @JsonIgnore
    private String imageBase64;

    @Size(max = 255)
    @Column(name = "file_name")
    private String fileName;

    @Size(max = 50)
    @Column(name = "file_type")
    private String fileType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "ocr_confidence")
    private Double ocrConfidence;

    @Size(max = 1000)
    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "auto_approved")
    private Boolean autoApproved = false;

    // OCR extracted fields
    @Size(max = 100)
    @Column(name = "extracted_name")
    private String extractedName;

    @Size(max = 100)
    @Column(name = "extracted_surname")
    private String extractedSurname;

    @Size(max = 20)
    @Column(name = "extracted_id_number")
    private String extractedIdNumber;

    @Size(max = 50)
    @Column(name = "extracted_license_number")
    private String extractedLicenseNumber;

    @Size(max = 20)
    @Column(name = "extracted_birth_date")
    private String extractedBirthDate;

    @Size(max = 20)
    @Column(name = "extracted_expiry_date")
    private String extractedExpiryDate;

    // Constructors
    public Document() {}

    public Document(Long userId, DocumentType type, String imageBase64) {
        this.userId = userId;
        this.type = type;
        this.imageBase64 = imageBase64;
        this.status = DocumentStatus.PENDING;
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

    public DocumentType getType() {
        return type;
    }

    public void setType(DocumentType type) {
        this.type = type;
    }

    public DocumentFace getFace() {
        return face;
    }

    public void setFace(DocumentFace face) {
        this.face = face;
    }

    public String getData() {
        return data;
    }

    public void setData(String data) {
        this.data = data;
    }

    public DocumentStatus getStatus() {
        return status;
    }

    public void setStatus(DocumentStatus status) {
        this.status = status;
    }

    public String getImageBase64() {
        return imageBase64;
    }

    public void setImageBase64(String imageBase64) {
        this.imageBase64 = imageBase64;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getFileType() {
        return fileType;
    }

    public void setFileType(String fileType) {
        this.fileType = fileType;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public Double getOcrConfidence() {
        return ocrConfidence;
    }

    public void setOcrConfidence(Double ocrConfidence) {
        this.ocrConfidence = ocrConfidence;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public Long getReviewedBy() {
        return reviewedBy;
    }

    public void setReviewedBy(Long reviewedBy) {
        this.reviewedBy = reviewedBy;
    }

    public Boolean getAutoApproved() {
        return autoApproved;
    }

    public void setAutoApproved(Boolean autoApproved) {
        this.autoApproved = autoApproved;
    }

    public String getExtractedName() {
        return extractedName;
    }

    public void setExtractedName(String extractedName) {
        this.extractedName = extractedName;
    }

    public String getExtractedSurname() {
        return extractedSurname;
    }

    public void setExtractedSurname(String extractedSurname) {
        this.extractedSurname = extractedSurname;
    }

    public String getExtractedIdNumber() {
        return extractedIdNumber;
    }

    public void setExtractedIdNumber(String extractedIdNumber) {
        this.extractedIdNumber = extractedIdNumber;
    }

    public String getExtractedLicenseNumber() {
        return extractedLicenseNumber;
    }

    public void setExtractedLicenseNumber(String extractedLicenseNumber) {
        this.extractedLicenseNumber = extractedLicenseNumber;
    }

    public String getExtractedBirthDate() {
        return extractedBirthDate;
    }

    public void setExtractedBirthDate(String extractedBirthDate) {
        this.extractedBirthDate = extractedBirthDate;
    }

    public String getExtractedExpiryDate() {
        return extractedExpiryDate;
    }

    public void setExtractedExpiryDate(String extractedExpiryDate) {
        this.extractedExpiryDate = extractedExpiryDate;
    }

    // Enums
    public enum DocumentType {
        DRIVING_LICENSE,
        IDENTITY_CARD,
        PASSPORT
    }

    public enum DocumentFace {
        FRONT,
        BACK
    }

    public enum DocumentStatus {
        PENDING,
        APPROVED,
        REJECTED,
        NEEDS_REVIEW
    }
} 