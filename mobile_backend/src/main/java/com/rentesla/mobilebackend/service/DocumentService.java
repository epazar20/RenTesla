package com.rentesla.mobilebackend.service;

import com.rentesla.mobilebackend.entity.Document;
import com.rentesla.mobilebackend.entity.User;
import com.rentesla.mobilebackend.repository.DocumentRepository;
import com.rentesla.mobilebackend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Base64;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.Executors;

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

    @Autowired
    private GoogleCloudVisionOCRService ocrService;

    @Value("${app.ocr.confidence.threshold:0.8}")
    private Double ocrConfidenceThreshold;

    @Value("${app.ocr.auto-approve.threshold:0.95}")
    private Double autoApproveThreshold;

    @Value("${app.ocr.timeout.seconds:30}")
    private int ocrTimeoutSeconds;

    /**
     * Upload and process a document with OCR
     */
    public ResponseEntity<Map<String, Object>> uploadDocument(
            Long userId, String type, String face, MultipartFile file) {
        
        System.out.println("🔄 Starting document upload process...");
        System.out.println("📋 Upload Details - User: " + userId + ", Type: " + type + ", Face: " + face);
        System.out.println("📁 File Details - Name: " + file.getOriginalFilename() + ", Size: " + file.getSize() + " bytes");
        
        try {
            // Get user information
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));
            
            System.out.println("👤 User found: " + user.getEmail() + " (ID: " + user.getId() + ")");
            
            // Convert file to base64
            String base64Image = Base64.getEncoder().encodeToString(file.getBytes());
            System.out.println("🔄 File converted to base64, length: " + base64Image.length() + " characters");
            
            // Create document entity with PENDING status
            Document document = new Document();
            document.setUserId(userId);
            document.setType(Document.DocumentType.valueOf(type.toUpperCase()));
            document.setFace(Document.DocumentFace.valueOf(face.toUpperCase()));
            document.setImageBase64(base64Image);
            document.setFileName(file.getOriginalFilename());
            document.setFileSize(file.getSize());
            document.setFileType(file.getContentType());
            document.setStatus(Document.DocumentStatus.PENDING); // Initially PENDING
            document.setAutoApproved(false);
            document.setCreatedAt(LocalDateTime.now());
            document.setUpdatedAt(LocalDateTime.now());
            
            // Save document first with PENDING status
            Document savedDocument = documentRepository.save(document);
            System.out.println("💾 Document saved with PENDING status - ID: " + savedDocument.getId());
            
            // Send notification about document upload
            notificationService.sendDocumentUploadedNotification(userId, savedDocument.getId());
            System.out.println("📬 Upload notification sent to user: " + userId);
            
            // Start async OCR processing with delay
            System.out.println("🤖 Starting async OCR processing...");
            processDocumentAsync(savedDocument, user);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Document uploaded successfully and processing started");
            response.put("documentId", savedDocument.getId());
            response.put("status", savedDocument.getStatus().name());
            
            System.out.println("✅ Document upload completed successfully - Document ID: " + savedDocument.getId());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("❌ Document upload failed: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Document upload failed: " + e.getMessage());
            
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    /**
     * Delete existing documents of same type and face for user
     */
    private void deleteExistingDocuments(Long userId, Document.DocumentType type, Document.DocumentFace face) {
        System.out.println("🗑️ Checking for existing documents - User: " + userId + ", Type: " + type + ", Face: " + face);
        
        try {
            List<Document> existingDocs = documentRepository.findByUserIdAndTypeAndFace(userId, type, face);
            
            if (!existingDocs.isEmpty()) {
                System.out.println("📄 Found " + existingDocs.size() + " existing documents to delete");
                
                for (Document doc : existingDocs) {
                    System.out.println("   - Deleting document: " + doc.getId());
                    documentRepository.delete(doc);
                }
                
                System.out.println("✅ Existing documents deleted successfully");
            } else {
                System.out.println("ℹ️ No existing documents found");
            }
            
        } catch (Exception e) {
            System.err.println("❌ Error deleting existing documents: " + e.getMessage());
            throw new RuntimeException("Failed to delete existing documents", e);
        }
    }

    /**
     * Upload and process a document with base64 encoded image
     */
    public Document uploadDocumentBase64(
            Long userId, String type, String face, String base64Image, String fileName) {
        
        System.out.println("🔄 Starting base64 document upload process...");
        System.out.println("📋 Upload Details - User: " + userId + ", Type: " + type + ", Face: " + face);
        
        try {
            // Get user information
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));
            
            System.out.println("👤 User found: " + user.getEmail() + " (ID: " + user.getId() + ")");
            
            // Delete existing documents of same type and face
            Document.DocumentType docType = Document.DocumentType.valueOf(type.toUpperCase());
            Document.DocumentFace docFace = Document.DocumentFace.valueOf(face.toUpperCase());
            deleteExistingDocuments(userId, docType, docFace);
            
            // Create document entity with PENDING status
            Document document = new Document();
            document.setUserId(userId);
            document.setType(docType);
            document.setFace(docFace);
            document.setImageBase64(base64Image);
            document.setFileName(fileName);
            document.setFileSize((long) base64Image.length());
            document.setFileType("image/jpeg"); // Assuming JPEG for mobile uploads
            document.setStatus(Document.DocumentStatus.PENDING);
            document.setAutoApproved(false);
            document.setCreatedAt(LocalDateTime.now());
            document.setUpdatedAt(LocalDateTime.now());
            
            // Save document first with PENDING status
            Document savedDocument = documentRepository.save(document);
            System.out.println("💾 Document saved with PENDING status - ID: " + savedDocument.getId());
            
            // Send notification about document upload
            notificationService.sendDocumentUploadedNotification(userId, savedDocument.getId());
            System.out.println("📬 Upload notification sent to user: " + userId);
            
            // Start async OCR processing
            System.out.println("🤖 Starting async OCR processing...");
            processDocumentAsync(savedDocument, user);
            
            return savedDocument;
            
        } catch (Exception e) {
            System.err.println("❌ Base64 document upload failed: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    // Async OCR processing method
    private void processDocumentAsync(Document document, User user) {
        // Use a separate thread for real OCR processing with timeout
        CompletableFuture.runAsync(() -> {
            try {
                System.out.println("⏱️ Starting real OCR processing for document ID: " + document.getId());
                System.out.println("🔍 Processing document type: " + document.getType() + ", face: " + document.getFace());
                System.out.println("⏰ OCR timeout set to: " + ocrTimeoutSeconds + " seconds");
                
                // Record processing start time
                long startTime = System.currentTimeMillis();
                
                // Create executor with timeout for OCR processing
                ExecutorService executor = Executors.newSingleThreadExecutor();
                Future<GoogleCloudVisionOCRService.OCRResult> future = executor.submit(() -> {
                    try {
                        return ocrService.processDocument(document, user);
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }
                });
                
                GoogleCloudVisionOCRService.OCRResult ocrResult;
                try {
                    // Wait for OCR result with timeout
                    ocrResult = future.get(ocrTimeoutSeconds, TimeUnit.SECONDS);
                } catch (TimeoutException e) {
                    System.err.println("⏰ OCR processing timeout after " + ocrTimeoutSeconds + " seconds for document: " + document.getId());
                    future.cancel(true);
                    throw new GoogleCloudVisionOCRService.OCRTimeoutException("OCR processing timeout after " + ocrTimeoutSeconds + " seconds");
                } finally {
                    executor.shutdownNow();
                }
                
                long processingTime = System.currentTimeMillis() - startTime;
                System.out.println("⚡ OCR processing completed in " + processingTime + "ms for document: " + document.getId());
                
                // Update document with OCR results
                document.setExtractedName(ocrResult.getFirstName());
                document.setExtractedSurname(ocrResult.getLastName());
                document.setExtractedIdNumber(ocrResult.getIdentityNumber());
                document.setExtractedBirthDate(ocrResult.getBirthDate());
                document.setExtractedExpiryDate(ocrResult.getExpiryDate());
                document.setExtractedLicenseNumber(ocrResult.getLicenseNumber());
                document.setOcrConfidence(ocrResult.getConfidence());
                
                System.out.println("📊 OCR results: Confidence: " + String.format("%.3f", ocrResult.getConfidence()) + 
                    ", Identity: " + ocrResult.getIdentityNumber() + ", Name: " + ocrResult.getFirstName() + " " + ocrResult.getLastName());
                
                // Perform automatic verification
                System.out.println("🎯 Starting automatic verification process...");
                boolean isVerified = performAutomaticVerification(document, user);
                
                if (isVerified && document.getOcrConfidence() >= ocrConfidenceThreshold) {
                    document.setStatus(Document.DocumentStatus.APPROVED);
                    document.setAutoApproved(true);
                    System.out.println("✅ Document auto-approved!");
                    logger.info("Document {} automatically approved after OCR verification", document.getId());
                    
                    // Update user verification status
                    updateUserVerificationStatus(document.getUserId());
                    
                    // Send success notification to user
                    notificationService.sendDocumentApprovedNotification(user.getId(), document.getId(), true, null);
                    
                } else {
                    document.setStatus(Document.DocumentStatus.NEEDS_REVIEW);
                    document.setAutoApproved(false);
                    System.out.println("⚠️ Document requires manual review");
                    logger.info("Document {} requires manual review", document.getId());
                    
                    // Send admin notification for manual review
                    sendAdminNotificationForManualReview(document, user, "Automatic verification failed");
                    
                    // Send user notification about manual review
                    notificationService.sendDocumentNeedsReviewToUser(user.getId(), document.getId());
                }
                
                document.setUpdatedAt(LocalDateTime.now());
                documentRepository.save(document);
                
                System.out.println("✨ OCR processing completed for document ID: " + document.getId());
                
            } catch (GoogleCloudVisionOCRService.OCRTimeoutException e) {
                System.err.println("⏰ OCR processing timeout for document ID: " + document.getId());
                System.err.println("❌ Timeout after " + ocrTimeoutSeconds + " seconds");
                
                // Mark document for manual review due to timeout
                document.setStatus(Document.DocumentStatus.NEEDS_REVIEW);
                document.setRejectionReason("OCR processing timeout after " + ocrTimeoutSeconds + " seconds");
                document.setAutoApproved(false);
                document.setOcrConfidence(0.0);
                document.setUpdatedAt(LocalDateTime.now());
                documentRepository.save(document);
                
                // Send admin notification for timeout
                sendAdminNotificationForManualReview(document, user, "OCR processing timeout (" + ocrTimeoutSeconds + "s)");
                
                // Notify user about manual review
                notificationService.sendDocumentNeedsReviewToUser(user.getId(), document.getId());
                
                logger.error("OCR timeout for document {}: Manual review required", document.getId());
                
            } catch (Exception e) {
                System.err.println("💥 OCR processing failed for document ID: " + document.getId());
                System.err.println("❌ Error: " + e.getMessage());
                e.printStackTrace();
                
                // Mark document as failed
                document.setStatus(Document.DocumentStatus.REJECTED);
                document.setRejectionReason("OCR processing failed: " + e.getMessage());
                document.setAutoApproved(false);
                document.setOcrConfidence(0.0);
                document.setUpdatedAt(LocalDateTime.now());
                documentRepository.save(document);
                
                // Notify user about failure
                notificationService.sendDocumentRejectedNotification(user.getId(), document.getId(), "OCR processing failed");
                
                logger.error("OCR processing error for document {}: {}", document.getId(), e.getMessage());
            }
        });
    }

    /**
     * Process OCR on uploaded document
     */
    private void processOCR(Document document) {
        // Get user for verification
        User user = userRepository.findById(document.getUserId())
            .orElseThrow(() -> new RuntimeException("User not found"));
            
        // Extract data based on document type
        performOCRExtraction(document, user);
        
        // Perform automatic verification
        boolean isVerified = performAutomaticVerification(document, user);
        
        if (isVerified && document.getOcrConfidence() > 0.8) {
            document.setStatus(Document.DocumentStatus.APPROVED);
            document.setAutoApproved(true);
            logger.info("Document {} automatically approved after OCR verification", document.getId());
            
            // Check if user verification is complete
            updateUserVerificationStatus(document.getUserId());
        } else {
            document.setStatus(Document.DocumentStatus.NEEDS_REVIEW);
            document.setAutoApproved(false);
            logger.info("Document {} requires manual review", document.getId());
        }
        
        document.setUpdatedAt(LocalDateTime.now());
    }

    /**
     * Perform automatic verification of OCR data against user registration data
     */
    private boolean performAutomaticVerification(Document document, User user) {
        try {
            logger.info("Starting automatic verification for document {} of user {}", 
                document.getId(), document.getUserId());
            
            // Check OCR confidence threshold
            if (document.getOcrConfidence() == null || document.getOcrConfidence() < ocrConfidenceThreshold) {
                logger.info("OCR confidence {} below threshold {} for document {}", 
                    document.getOcrConfidence(), ocrConfidenceThreshold, document.getId());
                return false;
            }
            
            boolean verificationPassed = true;
            StringBuilder verificationLog = new StringBuilder();
            
            // 1. Identity Number Verification (Exact Match)
            if (document.getExtractedIdNumber() != null && user.getIdentityNumber() != null) {
                String extractedId = document.getExtractedIdNumber().trim();
                String userIdentityNumber = user.getIdentityNumber().trim();
                
                if (!extractedId.equals(userIdentityNumber)) {
                    verificationPassed = false;
                    verificationLog.append("Identity number mismatch: ")
                        .append("Expected: ").append(userIdentityNumber)
                        .append(", Found: ").append(extractedId).append("; ");
                    logger.warn("Identity number verification failed for document {}: expected {}, found {}", 
                        document.getId(), userIdentityNumber, extractedId);
                }
            } else {
                verificationPassed = false;
                verificationLog.append("Missing identity number in OCR or user data; ");
                logger.warn("Missing identity number for document {}", document.getId());
            }
            
            // 2. First Name Verification (Case insensitive, fuzzy match)
            if (document.getExtractedName() != null && user.getFirstName() != null) {
                if (!isNameMatch(document.getExtractedName(), user.getFirstName())) {
                    verificationPassed = false;
                    verificationLog.append("First name mismatch: ")
                        .append("Expected: ").append(user.getFirstName())
                        .append(", Found: ").append(document.getExtractedName()).append("; ");
                    logger.warn("First name verification failed for document {}: expected {}, found {}", 
                        document.getId(), user.getFirstName(), document.getExtractedName());
                }
            } else {
                verificationPassed = false;
                verificationLog.append("Missing first name in OCR or user data; ");
            }
            
            // 3. Last Name Verification (Case insensitive, fuzzy match)
            if (document.getExtractedSurname() != null && user.getLastName() != null) {
                if (!isNameMatch(document.getExtractedSurname(), user.getLastName())) {
                    verificationPassed = false;
                    verificationLog.append("Last name mismatch: ")
                        .append("Expected: ").append(user.getLastName())
                        .append(", Found: ").append(document.getExtractedSurname()).append("; ");
                    logger.warn("Last name verification failed for document {}: expected {}, found {}", 
                        document.getId(), user.getLastName(), document.getExtractedSurname());
                }
            } else {
                verificationPassed = false;
                verificationLog.append("Missing last name in OCR or user data; ");
            }
            
            // Log verification result
            if (verificationPassed) {
                logger.info("Automatic verification PASSED for document {}", document.getId());
            } else {
                logger.info("Automatic verification FAILED for document {}: {}", 
                    document.getId(), verificationLog.toString());
                document.setRejectionReason("Automatic verification failed: " + verificationLog.toString());
            }
            
            return verificationPassed;
            
        } catch (Exception e) {
            logger.error("Error during automatic verification for document {}: {}", 
                document.getId(), e.getMessage(), e);
            return false;
        }
    }
    
    /**
     * Check if extracted name matches user's registered name (case insensitive, fuzzy)
     */
    private boolean isNameMatch(String extractedName, String registeredName) {
        if (extractedName == null || registeredName == null) {
            return false;
        }
        
        String cleaned1 = cleanName(extractedName);
        String cleaned2 = cleanName(registeredName);
        
        // Exact match after cleaning
        if (cleaned1.equals(cleaned2)) {
            return true;
        }
        
        // Check if one contains the other (for compound names)
        if (cleaned1.contains(cleaned2) || cleaned2.contains(cleaned1)) {
            return true;
        }
        
        // Simple fuzzy matching using Levenshtein-like logic
        return calculateSimilarity(cleaned1, cleaned2) > 0.8; // 80% similarity threshold
    }
    
    /**
     * Clean name for comparison (remove special chars, normalize case)
     */
    private String cleanName(String name) {
        return name.toUpperCase()
                  .replaceAll("[ÇçĞğIıİiÖöŞşÜü]", "")  // Remove Turkish chars for fuzzy matching
                  .replaceAll("[^A-Z ]", "")  // Keep only letters and spaces
                  .replaceAll("\\s+", " ")    // Normalize spaces
                  .trim();
    }
    
    /**
     * Calculate similarity between two strings (0.0 to 1.0)
     */
    private double calculateSimilarity(String s1, String s2) {
        int maxLength = Math.max(s1.length(), s2.length());
        if (maxLength == 0) return 1.0;
        
        return (maxLength - levenshteinDistance(s1, s2)) / (double) maxLength;
    }
    
    /**
     * Calculate Levenshtein distance between two strings
     */
    private int levenshteinDistance(String s1, String s2) {
        int[][] dp = new int[s1.length() + 1][s2.length() + 1];
        
        for (int i = 0; i <= s1.length(); i++) {
            for (int j = 0; j <= s2.length(); j++) {
                if (i == 0) {
                    dp[i][j] = j;
                } else if (j == 0) {
                    dp[i][j] = i;
                } else {
                    dp[i][j] = Math.min(Math.min(
                        dp[i - 1][j] + 1,
                        dp[i][j - 1] + 1),
                        dp[i - 1][j - 1] + (s1.charAt(i - 1) == s2.charAt(j - 1) ? 0 : 1)
                    );
                }
            }
        }
        
        return dp[s1.length()][s2.length()];
    }

    /**
     * Process driving license OCR
     */
    private void processDriverLicenseOCR(Document document) {
        // TODO: Implement Tesseract or Google Cloud Vision OCR
        // This is a mock implementation that uses realistic data for testing
        
        try {
            // Get user data to simulate realistic OCR extraction
            User user = userRepository.findById(document.getUserId()).orElse(null);
            
            // Simulate OCR with some realistic variations and potential errors
            if (user != null) {
                // Simulate successful OCR with user's actual data (for testing automatic verification)
                document.setExtractedName(user.getFirstName());
                document.setExtractedSurname(user.getLastName());
                document.setExtractedIdNumber(user.getIdentityNumber());
                document.setOcrConfidence(0.92); // High confidence for auto-approval
            } else {
                // Fallback to generic test data
        document.setExtractedName("John");
        document.setExtractedSurname("Doe");
                document.setExtractedIdNumber("12345678901");
                document.setOcrConfidence(0.75); // Lower confidence
            }
            
            // Additional license-specific data
            document.setExtractedLicenseNumber("DL" + System.currentTimeMillis() % 1000000);
        document.setExtractedBirthDate("1990-01-01");
        document.setExtractedExpiryDate("2030-01-01");
        
        // Create JSON data
        String jsonData = String.format(
                "{\"name\":\"%s\",\"surname\":\"%s\",\"idNumber\":\"%s\",\"licenseNumber\":\"%s\",\"birthDate\":\"%s\",\"expiryDate\":\"%s\"}",
            document.getExtractedName(), document.getExtractedSurname(), 
                document.getExtractedIdNumber(), document.getExtractedLicenseNumber(),
                document.getExtractedBirthDate(), document.getExtractedExpiryDate()
        );
        document.setData(jsonData);
            
            logger.info("Driving license OCR processed for document {}: confidence={}, extracted identity={}", 
                document.getId(), document.getOcrConfidence(), document.getExtractedIdNumber());
                
        } catch (Exception e) {
            logger.error("Error in driving license OCR processing: {}", e.getMessage(), e);
            document.setOcrConfidence(0.3); // Low confidence on error
            throw e;
        }
    }

    /**
     * Process identity card OCR
     */
    private void processIdentityCardOCR(Document document) {
        // TODO: Implement actual OCR processing
        // Mock implementation with realistic data
        
        try {
            // Get user data to simulate realistic OCR extraction
            User user = userRepository.findById(document.getUserId()).orElse(null);
            
            if (user != null) {
                // Simulate successful OCR with user's actual data
                document.setExtractedName(user.getFirstName());
                document.setExtractedSurname(user.getLastName());
                document.setExtractedIdNumber(user.getIdentityNumber());
                document.setOcrConfidence(0.89); // Good confidence
            } else {
                // Fallback data
                document.setExtractedName("Jane");
                document.setExtractedSurname("Smith");
                document.setExtractedIdNumber("98765432109");
                document.setOcrConfidence(0.70);
            }
            
            document.setExtractedBirthDate("1990-01-01");
        
        String jsonData = String.format(
            "{\"name\":\"%s\",\"surname\":\"%s\",\"idNumber\":\"%s\",\"birthDate\":\"%s\"}",
            document.getExtractedName(), document.getExtractedSurname(), 
            document.getExtractedIdNumber(), document.getExtractedBirthDate()
        );
        document.setData(jsonData);
            
            logger.info("Identity card OCR processed for document {}: confidence={}, extracted identity={}", 
                document.getId(), document.getOcrConfidence(), document.getExtractedIdNumber());
                
        } catch (Exception e) {
            logger.error("Error in identity card OCR processing: {}", e.getMessage(), e);
            document.setOcrConfidence(0.4);
            throw e;
        }
    }

    /**
     * Process passport OCR
     */
    private void processPassportOCR(Document document) {
        // TODO: Implement actual OCR processing
        // Mock implementation
        
        try {
            User user = userRepository.findById(document.getUserId()).orElse(null);
            
            if (user != null) {
                document.setExtractedName(user.getFirstName());
                document.setExtractedSurname(user.getLastName());
                // For passport, use a passport-style number based on identity
                document.setExtractedIdNumber("P" + user.getIdentityNumber().substring(0, 8));
                document.setOcrConfidence(0.94);
            } else {
                document.setExtractedName("Alex");
                document.setExtractedSurname("Johnson");
                document.setExtractedIdNumber("P12345678");
                document.setOcrConfidence(0.85);
            }
            
        document.setExtractedBirthDate("1990-01-01");
        document.setExtractedExpiryDate("2030-01-01");
        
        String jsonData = String.format(
            "{\"name\":\"%s\",\"surname\":\"%s\",\"passportNumber\":\"%s\",\"birthDate\":\"%s\",\"expiryDate\":\"%s\"}",
            document.getExtractedName(), document.getExtractedSurname(), 
            document.getExtractedIdNumber(), document.getExtractedBirthDate(), 
            document.getExtractedExpiryDate()
        );
        document.setData(jsonData);
            
            logger.info("Passport OCR processed for document {}: confidence={}, extracted identity={}", 
                document.getId(), document.getOcrConfidence(), document.getExtractedIdNumber());
                
        } catch (Exception e) {
            logger.error("Error in passport OCR processing: {}", e.getMessage(), e);
            document.setOcrConfidence(0.5);
            throw e;
        }
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
        logger.info("📋 Getting documents for user: {}", userId);
        List<Document> documents = documentRepository.findByUserId(userId);
        
        logger.info("📄 Found {} documents for user {}", documents.size(), userId);
        for (Document doc : documents) {
            boolean hasImage = doc.getImageBase64() != null && !doc.getImageBase64().isEmpty();
            int imageLength = hasImage ? doc.getImageBase64().length() : 0;
            logger.info("   - Document {}: Type={}, Face={}, Status={}, HasImage={}, ImageLength={}", 
                doc.getId(), doc.getType(), doc.getFace(), doc.getStatus(), hasImage, imageLength);
        }
        
        return documents;
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

    // === ADMIN METHODS ===

    /**
     * Get documents that need manual review (failed automatic verification)
     */
    @Transactional(readOnly = true)
    public List<Document> getDocumentsNeedingReview() {
        return documentRepository.findByStatus(Document.DocumentStatus.NEEDS_REVIEW);
    }

    /**
     * Get document processing statistics for admin dashboard
     */
    @Transactional(readOnly = true)
    public DocumentStatsResponse getDocumentStatistics() {
        long totalDocuments = documentRepository.count();
        long pendingDocuments = documentRepository.countByStatus(Document.DocumentStatus.PENDING);
        long approvedDocuments = documentRepository.countByStatus(Document.DocumentStatus.APPROVED);
        long rejectedDocuments = documentRepository.countByStatus(Document.DocumentStatus.REJECTED);
        long needsReviewDocuments = documentRepository.countByStatus(Document.DocumentStatus.NEEDS_REVIEW);
        
        long autoApprovedCount = documentRepository.countByAutoApproved(true);
        long manuallyReviewedCount = documentRepository.countByAutoApproved(false);
        
        return new DocumentStatsResponse(
            totalDocuments,
            pendingDocuments,
            approvedDocuments,
            rejectedDocuments,
            needsReviewDocuments,
            autoApprovedCount,
            manuallyReviewedCount
        );
    }

    /**
     * Perform bulk action on multiple documents
     */
    @Transactional
    public BulkActionResponse performBulkAction(List<Long> documentIds, String action, Long adminId, String reason) {
        if (documentIds == null || documentIds.isEmpty()) {
            throw new IllegalArgumentException("Document IDs cannot be empty");
        }
        
        Document.DocumentStatus targetStatus;
        switch (action.toUpperCase()) {
            case "APPROVE":
                targetStatus = Document.DocumentStatus.APPROVED;
                break;
            case "REJECT":
                targetStatus = Document.DocumentStatus.REJECTED;
                break;
            default:
                throw new IllegalArgumentException("Invalid action: " + action);
        }
        
        int successCount = 0;
        int failureCount = 0;
        StringBuilder errorMessages = new StringBuilder();
        
        for (Long documentId : documentIds) {
            try {
                reviewDocument(documentId, adminId, targetStatus, reason);
                successCount++;
            } catch (Exception e) {
                failureCount++;
                errorMessages.append("Document ").append(documentId).append(": ").append(e.getMessage()).append("; ");
                logger.error("Failed to {} document {}: {}", action, documentId, e.getMessage());
            }
        }
        
        String message = String.format("Bulk %s completed. Success: %d, Failed: %d", 
            action.toLowerCase(), successCount, failureCount);
        
        if (failureCount > 0) {
            message += ". Errors: " + errorMessages.toString();
        }
        
        logger.info("Bulk action {} by admin {} completed: {}", action, adminId, message);
        return new BulkActionResponse(message, successCount, failureCount);
    }

    /**
     * Get detailed verification information for admin review
     */
    @Transactional(readOnly = true)
    public DocumentVerificationDetailsResponse getDocumentVerificationDetails(Long documentId) {
        Document document = documentRepository.findById(documentId)
            .orElseThrow(() -> new RuntimeException("Document not found"));
        
        User user = userRepository.findById(document.getUserId())
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        StringBuilder details = new StringBuilder();
        details.append("=== DOCUMENT VERIFICATION DETAILS ===\n");
        details.append("Document ID: ").append(document.getId()).append("\n");
        details.append("User ID: ").append(user.getId()).append("\n");
        details.append("User Name: ").append(user.getFullName()).append("\n");
        details.append("Document Type: ").append(document.getType()).append("\n");
        details.append("Status: ").append(document.getStatus()).append("\n");
        details.append("OCR Confidence: ").append(document.getOcrConfidence()).append("\n");
        details.append("Auto Approved: ").append(document.getAutoApproved()).append("\n");
        details.append("Upload Date: ").append(document.getCreatedAt()).append("\n");
        
        details.append("\n=== USER REGISTRATION DATA ===\n");
        details.append("Identity Number: ").append(user.getIdentityNumber()).append("\n");
        details.append("First Name: ").append(user.getFirstName()).append("\n");
        details.append("Last Name: ").append(user.getLastName()).append("\n");
        details.append("Email: ").append(user.getEmail()).append("\n");
        
        details.append("\n=== OCR EXTRACTED DATA ===\n");
        details.append("Extracted Identity Number: ").append(document.getExtractedIdNumber()).append("\n");
        details.append("Extracted Name: ").append(document.getExtractedName()).append("\n");
        details.append("Extracted Surname: ").append(document.getExtractedSurname()).append("\n");
        details.append("Extracted Birth Date: ").append(document.getExtractedBirthDate()).append("\n");
        details.append("Extracted License Number: ").append(document.getExtractedLicenseNumber()).append("\n");
        
        details.append("\n=== VERIFICATION ANALYSIS ===\n");
        if (document.getRejectionReason() != null) {
            details.append("Rejection Reason: ").append(document.getRejectionReason()).append("\n");
        }
        
        // Perform real-time verification check
        boolean identityMatch = document.getExtractedIdNumber() != null && 
                               user.getIdentityNumber() != null &&
                               document.getExtractedIdNumber().trim().equals(user.getIdentityNumber().trim());
        
        boolean nameMatch = isNameMatch(document.getExtractedName(), user.getFirstName());
        boolean surnameMatch = isNameMatch(document.getExtractedSurname(), user.getLastName());
        
        details.append("Identity Number Match: ").append(identityMatch ? "✓ PASS" : "✗ FAIL").append("\n");
        details.append("First Name Match: ").append(nameMatch ? "✓ PASS" : "✗ FAIL").append("\n");
        details.append("Last Name Match: ").append(surnameMatch ? "✓ PASS" : "✗ FAIL").append("\n");
        details.append("OCR Confidence Check: ").append(
            (document.getOcrConfidence() != null && document.getOcrConfidence() >= ocrConfidenceThreshold) ? 
            "✓ PASS" : "✗ FAIL"
        ).append("\n");
        
        boolean overallPass = identityMatch && nameMatch && surnameMatch && 
                             (document.getOcrConfidence() != null && document.getOcrConfidence() >= ocrConfidenceThreshold);
        details.append("\nOVERALL VERIFICATION: ").append(overallPass ? "✓ PASS" : "✗ FAIL").append("\n");
        
        return new DocumentVerificationDetailsResponse(details.toString(), overallPass, identityMatch, nameMatch, surnameMatch);
    }

    // === RESPONSE DTOs ===
    
    public static class DocumentStatsResponse {
        private long totalDocuments;
        private long pendingDocuments;
        private long approvedDocuments;
        private long rejectedDocuments;
        private long needsReviewDocuments;
        private long autoApprovedCount;
        private long manuallyReviewedCount;
        
        public DocumentStatsResponse(long totalDocuments, long pendingDocuments, long approvedDocuments, 
                                   long rejectedDocuments, long needsReviewDocuments, 
                                   long autoApprovedCount, long manuallyReviewedCount) {
            this.totalDocuments = totalDocuments;
            this.pendingDocuments = pendingDocuments;
            this.approvedDocuments = approvedDocuments;
            this.rejectedDocuments = rejectedDocuments;
            this.needsReviewDocuments = needsReviewDocuments;
            this.autoApprovedCount = autoApprovedCount;
            this.manuallyReviewedCount = manuallyReviewedCount;
        }
        
        // Getters
        public long getTotalDocuments() { return totalDocuments; }
        public long getPendingDocuments() { return pendingDocuments; }
        public long getApprovedDocuments() { return approvedDocuments; }
        public long getRejectedDocuments() { return rejectedDocuments; }
        public long getNeedsReviewDocuments() { return needsReviewDocuments; }
        public long getAutoApprovedCount() { return autoApprovedCount; }
        public long getManuallyReviewedCount() { return manuallyReviewedCount; }
    }
    
    public static class BulkActionResponse {
        private String message;
        private int successCount;
        private int failureCount;
        
        public BulkActionResponse(String message, int successCount, int failureCount) {
            this.message = message;
            this.successCount = successCount;
            this.failureCount = failureCount;
        }
        
        // Getters
        public String getMessage() { return message; }
        public int getSuccessCount() { return successCount; }
        public int getFailureCount() { return failureCount; }
    }
    
    public static class DocumentVerificationDetailsResponse {
        private String verificationDetails;
        private boolean overallPass;
        private boolean identityMatch;
        private boolean nameMatch;
        private boolean surnameMatch;
        
        public DocumentVerificationDetailsResponse(String verificationDetails, boolean overallPass, 
                                                 boolean identityMatch, boolean nameMatch, boolean surnameMatch) {
            this.verificationDetails = verificationDetails;
            this.overallPass = overallPass;
            this.identityMatch = identityMatch;
            this.nameMatch = nameMatch;
            this.surnameMatch = surnameMatch;
        }
        
        // Getters
        public String getVerificationDetails() { return verificationDetails; }
        public boolean isOverallPass() { return overallPass; }
        public boolean isIdentityMatch() { return identityMatch; }
        public boolean isNameMatch() { return nameMatch; }
        public boolean isSurnameMatch() { return surnameMatch; }
    }

    // Perform OCR extraction on document
    private void performOCRExtraction(Document document, User user) {
        System.out.println("🔍 Starting OCR extraction for document type: " + document.getType());
        
        try {
            // Simulate OCR processing based on document type
            switch (document.getType()) {
                case DRIVING_LICENSE:
                    extractDrivingLicenseData(document, user);
                    break;
                case IDENTITY_CARD:
                    extractIdentityCardData(document, user);
                    break;
                case PASSPORT:
                    extractPassportData(document, user);
                    break;
                default:
                    System.out.println("⚠️ Unknown document type: " + document.getType());
                    break;
            }
            
            System.out.println("✅ OCR extraction completed for document ID: " + document.getId());
            
        } catch (Exception e) {
            System.err.println("❌ OCR extraction failed: " + e.getMessage());
            throw new RuntimeException("OCR extraction failed", e);
        }
    }
    
    // Extract driving license data
    private void extractDrivingLicenseData(Document document, User user) {
        System.out.println("🚗 Extracting driving license data...");
        
        // Simulate realistic OCR extraction using user's actual data
        double confidence = 0.89 + (Math.random() * 0.08); // 0.89-0.97 confidence
        String extractedIdentity = user.getIdentityNumber();
        String extractedName = user.getFirstName();
        String extractedSurname = user.getLastName();
        String licenseNumber = "B" + (100000 + (int)(Math.random() * 900000));
        
        document.setOcrConfidence(confidence);
        document.setExtractedIdNumber(extractedIdentity);
        document.setExtractedName(extractedName);
        document.setExtractedSurname(extractedSurname);
        document.setExtractedLicenseNumber(licenseNumber);
        document.setExtractedBirthDate("1988-05-21"); // Mock data
        document.setExtractedExpiryDate("2033-05-21"); // Mock data
        
        System.out.println("📊 Driving license OCR results:");
        System.out.println("   - Confidence: " + String.format("%.3f", confidence));
        System.out.println("   - Identity Number: " + extractedIdentity);
        System.out.println("   - Name: " + extractedName + " " + extractedSurname);
        System.out.println("   - License Number: " + licenseNumber);
    }
    
    // Extract identity card data
    private void extractIdentityCardData(Document document, User user) {
        System.out.println("🆔 Extracting identity card data...");
        
        double confidence = 0.85 + (Math.random() * 0.09); // 0.85-0.94 confidence
        String extractedIdentity = user.getIdentityNumber();
        String extractedName = user.getFirstName();
        String extractedSurname = user.getLastName();
        
        document.setOcrConfidence(confidence);
        document.setExtractedIdNumber(extractedIdentity);
        document.setExtractedName(extractedName);
        document.setExtractedSurname(extractedSurname);
        document.setExtractedBirthDate("1988-05-21"); // Mock data
        
        System.out.println("📊 Identity card OCR results:");
        System.out.println("   - Confidence: " + String.format("%.3f", confidence));
        System.out.println("   - Identity Number: " + extractedIdentity);
        System.out.println("   - Name: " + extractedName + " " + extractedSurname);
    }
    
    // Extract passport data
    private void extractPassportData(Document document, User user) {
        System.out.println("🛂 Extracting passport data...");
        
        double confidence = 0.91 + (Math.random() * 0.07); // 0.91-0.98 confidence
        String extractedIdentity = user.getIdentityNumber();
        String extractedName = user.getFirstName();
        String extractedSurname = user.getLastName();
        
        document.setOcrConfidence(confidence);
        document.setExtractedIdNumber(extractedIdentity);
        document.setExtractedName(extractedName);
        document.setExtractedSurname(extractedSurname);
        document.setExtractedBirthDate("1988-05-21"); // Mock data
        document.setExtractedExpiryDate("2034-05-21"); // Mock data
        
        System.out.println("📊 Passport OCR results:");
        System.out.println("   - Confidence: " + String.format("%.3f", confidence));
        System.out.println("   - Identity Number: " + extractedIdentity);
        System.out.println("   - Name: " + extractedName + " " + extractedSurname);
    }
    
    // Check if user has approved document of specific type
    private boolean hasApprovedDocument(Long userId, Document.DocumentType documentType) {
        System.out.println("🔍 Checking for approved " + documentType + " document for user: " + userId);
        
        try {
            return documentRepository.existsByUserIdAndTypeAndStatus(
                userId, 
                documentType, 
                Document.DocumentStatus.APPROVED
            );
        } catch (Exception e) {
            System.err.println("❌ Error checking approved document: " + e.getMessage());
            return false;
        }
    }

    /**
     * Delete a document by ID with user ownership validation
     */
    @Transactional
    public Map<String, Object> deleteDocument(Long documentId, Long userId) {
        try {
            System.out.println("🗑️ Attempting to delete document with ID: " + documentId + " for user: " + userId);
            
            Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found with ID: " + documentId));
            
            // Security check: Ensure user owns the document
            if (!document.getUserId().equals(userId)) {
                System.err.println("🚫 Security violation: User " + userId + " tried to delete document owned by user " + document.getUserId());
                throw new RuntimeException("Access denied: You can only delete your own documents");
            }
            
            System.out.println("📄 Document found - Type: " + document.getType() + ", User: " + document.getUserId());
            
            // Delete the document
            documentRepository.delete(document);
            System.out.println("✅ Document deleted successfully");
            
            // Update user verification status after deletion
            updateUserVerificationStatus(document.getUserId());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Document deleted successfully");
            response.put("documentId", documentId);
            
            return response;
            
        } catch (Exception e) {
            System.err.println("❌ Error deleting document: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to delete document: " + e.getMessage());
        }
    }

    /**
     * Send admin notification for manual review
     */
    private void sendAdminNotificationForManualReview(Document document, User user, String reason) {
        try {
            System.out.println("📢 Sending admin notification for manual review - Document: " + document.getId());
            
            // Send notification to admin users about document requiring manual review
            notificationService.sendDocumentNeedsReviewToAdmins(document.getId(), user.getId());
            
            logger.info("Admin notification sent for document {} requiring manual review: {}", 
                document.getId(), reason);
                
        } catch (Exception e) {
            logger.error("Failed to send admin notification for document {}: {}", 
                document.getId(), e.getMessage());
            // Don't throw exception here as this is not critical for document processing
        }
    }
} 