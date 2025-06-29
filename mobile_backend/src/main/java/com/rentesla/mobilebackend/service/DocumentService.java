package com.rentesla.mobilebackend.service;

import com.rentesla.mobilebackend.entity.Document;
import com.rentesla.mobilebackend.entity.User;
import com.rentesla.mobilebackend.repository.DocumentRepository;
import com.rentesla.mobilebackend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class DocumentService {

    private static final Logger logger = LoggerFactory.getLogger(DocumentService.class);

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    @Value("${app.ocr.confidence.threshold:0.8}")
    private Double ocrConfidenceThreshold;

    @Value("${app.ocr.auto-approve.threshold:0.95}")
    private Double autoApproveThreshold;

    /**
     * Upload and process a document with OCR
     */
    public Document uploadDocument(Long userId, Document.DocumentType type, String imageBase64, String fileName, Document.DocumentFace face) {
        logger.info("Uploading document for user: {} of type: {} face: {}", userId, type, face);

        // Check if user exists and has given consent
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (!user.getKvkkConsentGiven() || !user.getOpenConsentGiven()) {
            throw new RuntimeException("User must give consent before uploading documents");
        }

        // Create document entity
        Document document = new Document(userId, type, imageBase64);
        document.setFileName(fileName);
        document.setFace(face);
        document.setFileType("image/jpeg"); // Default, can be enhanced
        document.setFileSize((long) imageBase64.length());

        try {
            // Process OCR
            processOCR(document);
            
            // Save document
            document = documentRepository.save(document);
            
            // Send notification to user
            notificationService.sendDocumentUploadedNotification(userId, document.getId());
            
            logger.info("Document uploaded successfully: {}", document.getId());
            return document;
            
        } catch (Exception e) {
            logger.error("Error processing document for user: {}", userId, e);
            document.setStatus(Document.DocumentStatus.NEEDS_REVIEW);
            document.setRejectionReason("Error processing document: " + e.getMessage());
            return documentRepository.save(document);
        }
    }

    /**
     * Process OCR on document
     */
    private void processOCR(Document document) {
        try {
            // TODO: Implement actual OCR processing
            // This is a placeholder implementation
            
            // Simulate OCR processing based on document type
            switch (document.getType()) {
                case DRIVING_LICENSE:
                    processDriverLicenseOCR(document);
                    break;
                case IDENTITY_CARD:
                    processIdentityCardOCR(document);
                    break;
                case PASSPORT:
                    processPassportOCR(document);
                    break;
            }
            
            // Determine status based on confidence
            // For now, always approve documents (as requested)
            document.setStatus(Document.DocumentStatus.APPROVED);
            document.setAutoApproved(true);
            
            // Update user verification status
            updateUserVerificationStatus(document.getUserId());
            
        } catch (Exception e) {
            logger.error("OCR processing failed for document: {}", document.getId(), e);
            document.setOcrConfidence(0.0);
            document.setStatus(Document.DocumentStatus.NEEDS_REVIEW);
            throw e;
        }
    }

    /**
     * Process driving license OCR
     */
    private void processDriverLicenseOCR(Document document) {
        // TODO: Implement Tesseract or Google Cloud Vision OCR
        // This is a mock implementation
        
        // Simulate extracted data
        document.setExtractedName("John");
        document.setExtractedSurname("Doe");
        document.setExtractedLicenseNumber("DL123456789");
        document.setExtractedBirthDate("1990-01-01");
        document.setExtractedExpiryDate("2030-01-01");
        document.setOcrConfidence(0.92);
        
        // Create JSON data
        String jsonData = String.format(
            "{\"name\":\"%s\",\"surname\":\"%s\",\"licenseNumber\":\"%s\",\"birthDate\":\"%s\",\"expiryDate\":\"%s\"}",
            document.getExtractedName(), document.getExtractedSurname(), 
            document.getExtractedLicenseNumber(), document.getExtractedBirthDate(), 
            document.getExtractedExpiryDate()
        );
        document.setData(jsonData);
    }

    /**
     * Process identity card OCR
     */
    private void processIdentityCardOCR(Document document) {
        // TODO: Implement actual OCR processing
        // Mock implementation
        document.setExtractedName("John");
        document.setExtractedSurname("Doe");
        document.setExtractedIdNumber("12345678901");
        document.setExtractedBirthDate("1990-01-01");
        document.setOcrConfidence(0.89);
        
        String jsonData = String.format(
            "{\"name\":\"%s\",\"surname\":\"%s\",\"idNumber\":\"%s\",\"birthDate\":\"%s\"}",
            document.getExtractedName(), document.getExtractedSurname(), 
            document.getExtractedIdNumber(), document.getExtractedBirthDate()
        );
        document.setData(jsonData);
    }

    /**
     * Process passport OCR
     */
    private void processPassportOCR(Document document) {
        // TODO: Implement actual OCR processing
        // Mock implementation
        document.setExtractedName("John");
        document.setExtractedSurname("Doe");
        document.setExtractedIdNumber("P123456789");
        document.setExtractedBirthDate("1990-01-01");
        document.setExtractedExpiryDate("2030-01-01");
        document.setOcrConfidence(0.94);
        
        String jsonData = String.format(
            "{\"name\":\"%s\",\"surname\":\"%s\",\"passportNumber\":\"%s\",\"birthDate\":\"%s\",\"expiryDate\":\"%s\"}",
            document.getExtractedName(), document.getExtractedSurname(), 
            document.getExtractedIdNumber(), document.getExtractedBirthDate(), 
            document.getExtractedExpiryDate()
        );
        document.setData(jsonData);
    }

    /**
     * Admin review and approve/reject document
     */
    public Document reviewDocument(Long documentId, Long adminId, Document.DocumentStatus status, String reason) {
        Document document = documentRepository.findById(documentId)
            .orElseThrow(() -> new RuntimeException("Document not found"));

        document.setStatus(status);
        document.setReviewedBy(adminId);
        
        if (status == Document.DocumentStatus.REJECTED) {
            document.setRejectionReason(reason);
        } else if (status == Document.DocumentStatus.APPROVED) {
            // Update user verification status
            updateUserVerificationStatus(document.getUserId());
        }

        document = documentRepository.save(document);

        // Send notification to user
        notificationService.sendDocumentReviewedNotification(document.getUserId(), document.getId(), status);

        return document;
    }

    /**
     * Update user verification status based on approved documents
     */
    private void updateUserVerificationStatus(Long userId) {
        boolean hasApprovedDriverLicense = documentRepository.hasApprovedDocument(userId, Document.DocumentType.DRIVING_LICENSE);
        boolean hasApprovedIdentity = documentRepository.hasApprovedDocument(userId, Document.DocumentType.IDENTITY_CARD) ||
                                     documentRepository.hasApprovedDocument(userId, Document.DocumentType.PASSPORT);

        // Business Logic:
        // - If driving license is approved → user is verified (identity card is optional)
        // - If no driving license → identity card OR passport is required
        boolean isVerified = hasApprovedDriverLicense || hasApprovedIdentity;

        if (isVerified) {
            User user = userRepository.findById(userId).orElse(null);
            if (user != null && !user.getDocumentVerified()) {
                user.setDocumentVerified(true);
                userRepository.save(user);
                
                // Send verification complete notification
                notificationService.sendVerificationCompleteNotification(userId);
                
                logger.info("User {} verification completed. Driver License: {}, Identity: {}", 
                    userId, hasApprovedDriverLicense, hasApprovedIdentity);
            }
        }
    }

    /**
     * Get user documents
     */
    @Transactional(readOnly = true)
    public List<Document> getUserDocuments(Long userId) {
        return documentRepository.findByUserId(userId);
    }

    /**
     * Get documents pending review
     */
    @Transactional(readOnly = true)
    public List<Document> getPendingDocuments() {
        return documentRepository.findPendingDocumentsForReview();
    }

    /**
     * Get document by ID
     */
    @Transactional(readOnly = true)
    public Optional<Document> getDocument(Long documentId) {
        return documentRepository.findById(documentId);
    }

    /**
     * Check if user has all required documents approved
     */
    @Transactional(readOnly = true)
    public boolean isUserFullyVerified(Long userId) {
        boolean hasApprovedDriverLicense = documentRepository.hasApprovedDocument(userId, Document.DocumentType.DRIVING_LICENSE);
        boolean hasApprovedIdentity = documentRepository.hasApprovedDocument(userId, Document.DocumentType.IDENTITY_CARD) ||
                                     documentRepository.hasApprovedDocument(userId, Document.DocumentType.PASSPORT);
        
        // Business Logic:
        // - If driving license is approved → user is verified (identity card is optional)
        // - If no driving license → identity card OR passport is required
        return hasApprovedDriverLicense || hasApprovedIdentity;
    }

    /**
     * Get documents with low OCR confidence for review
     */
    @Transactional(readOnly = true)
    public List<Document> getDocumentsWithLowConfidence() {
        return documentRepository.findDocumentsWithLowConfidence(ocrConfidenceThreshold);
    }
} 