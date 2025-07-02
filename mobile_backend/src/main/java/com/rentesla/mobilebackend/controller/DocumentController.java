package com.rentesla.mobilebackend.controller;

import com.rentesla.mobilebackend.entity.Document;
import com.rentesla.mobilebackend.service.DocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.HashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/documents")
@Tag(name = "Document Management", description = "Document upload and verification operations")
@CrossOrigin(origins = "*")
public class DocumentController {

    @Autowired
    private DocumentService documentService;

    @PostMapping("/upload")
    @Operation(summary = "Upload document", description = "Upload document for verification")
    public ResponseEntity<?> uploadDocument(
            @RequestParam("userId") Long userId,
            @RequestParam("type") String type,
            @RequestParam("face") String face,
            @RequestParam("file") MultipartFile file) {
        
        System.out.println("📥 Document upload request received:");
        System.out.println("   - User ID: " + userId);
        System.out.println("   - Document Type: " + type);
        System.out.println("   - Document Face: " + face);
        System.out.println("   - File: " + file.getOriginalFilename());
        
        try {
            return documentService.uploadDocument(userId, type, face, file);
        } catch (Exception e) {
            System.err.println("❌ Document upload failed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "message", "Document upload failed: " + e.getMessage()
            ));
        }
    }

    @PostMapping("/upload/base64")
    @Operation(summary = "Upload document using base64", description = "Upload document for verification using base64 encoded image")
    public ResponseEntity<?> uploadDocumentBase64(@RequestBody DocumentUploadRequest request) {
        System.out.println("📥 Base64 document upload request received:");
        System.out.println("   - User ID: " + request.getUserId());
        System.out.println("   - Document Type: " + request.getDocumentType());
        System.out.println("   - Document Face: " + request.getFace());
        System.out.println("   - File Name: " + request.getFileName());
        System.out.println("   - Image Base64 Length: " + (request.getImageBase64() != null ? request.getImageBase64().length() : 0));
        
        try {
            // Validate request
            if (request.getUserId() == null || request.getDocumentType() == null || 
                request.getImageBase64() == null || request.getImageBase64().isEmpty()) {
                System.err.println("❌ Invalid request parameters");
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Missing required fields"
                ));
            }

            // Validate base64 format
            if (!request.getImageBase64().matches("^data:image\\/[a-zA-Z]+;base64,.*")) {
                System.err.println("❌ Invalid base64 format");
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Invalid image format"
                ));
            }

            // Process document upload
            Document document = documentService.uploadDocumentBase64(
                request.getUserId(),
                request.getDocumentType().toString(),
                request.getFace().toString(),
                request.getImageBase64(),
                request.getFileName()
            );

            System.out.println("✅ Document uploaded successfully - ID: " + document.getId());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Document uploaded successfully");
            response.put("documentId", document.getId());
            response.put("type", document.getType());
            response.put("face", document.getFace());
            response.put("status", document.getStatus());
            
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

    @GetMapping("/user/{userId}")
    @Operation(summary = "Get user documents", description = "Get all documents for a specific user")
    public ResponseEntity<List<DocumentResponse>> getUserDocuments(
            @Parameter(description = "User ID") @PathVariable Long userId) {
        try {
        List<Document> documents = documentService.getUserDocuments(userId);
            List<DocumentResponse> response = documents.stream()
                .map(this::convertToDocumentResponse)
                .collect(Collectors.toList());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    private DocumentResponse convertToDocumentResponse(Document document) {
        DocumentResponse response = new DocumentResponse();
        response.setId(document.getId());
        response.setUserId(document.getUserId());
        response.setType(document.getType());
        response.setFace(document.getFace());
        response.setStatus(document.getStatus());
        response.setFileName(document.getFileName());
        response.setFileType(document.getFileType());
        response.setFileSize(document.getFileSize());
        response.setOcrConfidence(document.getOcrConfidence());
        response.setRejectionReason(document.getRejectionReason());
        response.setReviewedBy(document.getReviewedBy());
        response.setAutoApproved(document.getAutoApproved());
        response.setExtractedName(document.getExtractedName());
        response.setExtractedSurname(document.getExtractedSurname());
        response.setExtractedIdNumber(document.getExtractedIdNumber());
        response.setExtractedLicenseNumber(document.getExtractedLicenseNumber());
        response.setExtractedBirthDate(document.getExtractedBirthDate());
        response.setExtractedExpiryDate(document.getExtractedExpiryDate());
        response.setCreatedAt(document.getCreatedAt());
        response.setUpdatedAt(document.getUpdatedAt());
        
        // Manually include imageBase64 data
        response.setImageBase64(document.getImageBase64());
        
        return response;
    }

    @GetMapping("/{documentId}")
    @Operation(summary = "Get document by ID", description = "Get document details by ID")
    public ResponseEntity<Document> getDocument(
            @Parameter(description = "Document ID") @PathVariable Long documentId) {
        Optional<Document> document = documentService.getDocument(documentId);
        return document.map(ResponseEntity::ok)
                      .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/pending")
    @Operation(summary = "Get pending documents", description = "Get documents pending manual review (Admin only)")
    public ResponseEntity<List<Document>> getPendingDocuments() {
        List<Document> documents = documentService.getPendingDocuments();
        return ResponseEntity.ok(documents);
    }

    @GetMapping("/low-confidence")
    @Operation(summary = "Get low confidence documents", description = "Get documents with low OCR confidence (Admin only)")
    public ResponseEntity<List<Document>> getLowConfidenceDocuments() {
        List<Document> documents = documentService.getDocumentsWithLowConfidence();
        return ResponseEntity.ok(documents);
    }

    @PostMapping("/{documentId}/review")
    @Operation(summary = "Review document", description = "Admin review and approve/reject document")
    public ResponseEntity<Document> reviewDocument(
            @Parameter(description = "Document ID") @PathVariable Long documentId,
            @RequestBody DocumentReviewRequest request) {
        try {
            Document document = documentService.reviewDocument(
                documentId,
                request.getAdminId(),
                request.getStatus(),
                request.getReason()
            );
            return ResponseEntity.ok(document);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/user/{userId}/verification-status")
    @Operation(summary = "Check user verification", description = "Check if user is fully verified")
    public ResponseEntity<VerificationStatusResponse> checkUserVerification(
            @Parameter(description = "User ID") @PathVariable Long userId) {
        boolean isVerified = documentService.isUserFullyVerified(userId);
        return ResponseEntity.ok(new VerificationStatusResponse(isVerified));
    }

    // === ADMIN ENDPOINTS ===

    @GetMapping("/admin/pending-review")
    @Operation(summary = "Get documents needing manual review", description = "Get all documents that failed automatic verification (Admin only)")
    public ResponseEntity<List<Document>> getDocumentsNeedingReview() {
        List<Document> documents = documentService.getDocumentsNeedingReview();
        return ResponseEntity.ok(documents);
    }

    @GetMapping("/admin/stats")
    @Operation(summary = "Get document statistics", description = "Get document processing statistics (Admin only)")
    public ResponseEntity<DocumentService.DocumentStatsResponse> getDocumentStats() {
        DocumentService.DocumentStatsResponse stats = documentService.getDocumentStatistics();
        return ResponseEntity.ok(stats);
    }

    @PostMapping("/admin/{documentId}/approve")
    @Operation(summary = "Admin approve document", description = "Manually approve a document (Admin only)")
    public ResponseEntity<Document> adminApproveDocument(
            @Parameter(description = "Document ID") @PathVariable Long documentId,
            @RequestBody AdminDocumentActionRequest request) {
        try {
            Document document = documentService.reviewDocument(
                documentId,
                request.getAdminId(),
                Document.DocumentStatus.APPROVED,
                request.getReason()
            );
            return ResponseEntity.ok(document);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/admin/{documentId}/reject")
    @Operation(summary = "Admin reject document", description = "Manually reject a document (Admin only)")
    public ResponseEntity<Document> adminRejectDocument(
            @Parameter(description = "Document ID") @PathVariable Long documentId,
            @RequestBody AdminDocumentActionRequest request) {
        try {
            Document document = documentService.reviewDocument(
                documentId,
                request.getAdminId(),
                Document.DocumentStatus.REJECTED,
                request.getReason()
            );
            return ResponseEntity.ok(document);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/admin/bulk-action")
    @Operation(summary = "Bulk document action", description = "Perform bulk approve/reject on multiple documents (Admin only)")
    public ResponseEntity<DocumentService.BulkActionResponse> bulkDocumentAction(@RequestBody BulkDocumentActionRequest request) {
        DocumentService.BulkActionResponse response = documentService.performBulkAction(
            request.getDocumentIds(),
            request.getAction(),
            request.getAdminId(),
            request.getReason()
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/admin/{documentId}/verification-details")
    @Operation(summary = "Get document verification details", description = "Get detailed verification info for admin review")
    public ResponseEntity<DocumentService.DocumentVerificationDetailsResponse> getDocumentVerificationDetails(
            @Parameter(description = "Document ID") @PathVariable Long documentId) {
        try {
            DocumentService.DocumentVerificationDetailsResponse details = documentService.getDocumentVerificationDetails(documentId);
            return ResponseEntity.ok(details);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{documentId}")
    @Operation(summary = "Delete document", description = "Delete a document (User can only delete their own documents)")
    public ResponseEntity<Map<String, Object>> deleteDocument(
            @Parameter(description = "Document ID") @PathVariable Long documentId,
            @RequestParam("userId") Long userId) {
        try {
            Map<String, Object> result = documentService.deleteDocument(documentId, userId);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(404).body(errorResponse);
        }
    }

    // DTOs
    public static class DocumentUploadRequest {
        private Long userId;
        private Document.DocumentType documentType;
        private String imageBase64;
        private String fileName;
        private Document.DocumentFace face;

        public Long getUserId() {
            return userId;
        }

        public void setUserId(Long userId) {
            this.userId = userId;
        }

        public Document.DocumentType getDocumentType() {
            return documentType;
        }

        public void setDocumentType(Document.DocumentType documentType) {
            this.documentType = documentType;
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

        public Document.DocumentFace getFace() {
            return face;
        }

        public void setFace(Document.DocumentFace face) {
            this.face = face;
        }
    }

    public static class DocumentReviewRequest {
        private Long adminId;
        private Document.DocumentStatus status;
        private String reason;

        public Long getAdminId() {
            return adminId;
        }

        public void setAdminId(Long adminId) {
            this.adminId = adminId;
        }

        public Document.DocumentStatus getStatus() {
            return status;
        }

        public void setStatus(Document.DocumentStatus status) {
            this.status = status;
        }

        public String getReason() {
            return reason;
        }

        public void setReason(String reason) {
            this.reason = reason;
        }
    }

    public static class VerificationStatusResponse {
        private boolean isVerified;

        public VerificationStatusResponse(boolean isVerified) {
            this.isVerified = isVerified;
        }

        public boolean isVerified() {
            return isVerified;
        }

        public void setVerified(boolean verified) {
            isVerified = verified;
        }
    }

    public static class AdminDocumentActionRequest {
        private Long adminId;
        private String reason;

        public Long getAdminId() {
            return adminId;
        }

        public void setAdminId(Long adminId) {
            this.adminId = adminId;
        }

        public String getReason() {
            return reason;
        }

        public void setReason(String reason) {
            this.reason = reason;
        }
    }

    public static class BulkActionResponse {
        private String message;

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }
    }

    public static class BulkDocumentActionRequest {
        private List<Long> documentIds;
        private String action;
        private Long adminId;
        private String reason;

        public List<Long> getDocumentIds() {
            return documentIds;
        }

        public void setDocumentIds(List<Long> documentIds) {
            this.documentIds = documentIds;
        }

        public String getAction() {
            return action;
        }

        public void setAction(String action) {
            this.action = action;
        }

        public Long getAdminId() {
            return adminId;
        }

        public void setAdminId(Long adminId) {
            this.adminId = adminId;
        }

        public String getReason() {
            return reason;
        }

        public void setReason(String reason) {
            this.reason = reason;
        }
    }

    public static class DocumentVerificationDetailsResponse {
        private String verificationDetails;

        public String getVerificationDetails() {
            return verificationDetails;
        }

        public void setVerificationDetails(String verificationDetails) {
            this.verificationDetails = verificationDetails;
        }
    }
    
    public static class DocumentResponse {
        private Long id;
        private Long userId;
        private Document.DocumentType type;
        private Document.DocumentFace face;
        private Document.DocumentStatus status;
        private String imageBase64; // This will be included in JSON response
        private String fileName;
        private String fileType;
        private Long fileSize;
        private Double ocrConfidence;
        private String rejectionReason;
        private Long reviewedBy;
        private Boolean autoApproved;
        private String extractedName;
        private String extractedSurname;
        private String extractedIdNumber;
        private String extractedLicenseNumber;
        private String extractedBirthDate;
        private String extractedExpiryDate;
        private java.time.LocalDateTime createdAt;
        private java.time.LocalDateTime updatedAt;

        // Getters and Setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }

        public Document.DocumentType getType() { return type; }
        public void setType(Document.DocumentType type) { this.type = type; }

        public Document.DocumentFace getFace() { return face; }
        public void setFace(Document.DocumentFace face) { this.face = face; }

        public Document.DocumentStatus getStatus() { return status; }
        public void setStatus(Document.DocumentStatus status) { this.status = status; }

        public String getImageBase64() { return imageBase64; }
        public void setImageBase64(String imageBase64) { this.imageBase64 = imageBase64; }

        public String getFileName() { return fileName; }
        public void setFileName(String fileName) { this.fileName = fileName; }

        public String getFileType() { return fileType; }
        public void setFileType(String fileType) { this.fileType = fileType; }

        public Long getFileSize() { return fileSize; }
        public void setFileSize(Long fileSize) { this.fileSize = fileSize; }

        public Double getOcrConfidence() { return ocrConfidence; }
        public void setOcrConfidence(Double ocrConfidence) { this.ocrConfidence = ocrConfidence; }

        public String getRejectionReason() { return rejectionReason; }
        public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

        public Long getReviewedBy() { return reviewedBy; }
        public void setReviewedBy(Long reviewedBy) { this.reviewedBy = reviewedBy; }

        public Boolean getAutoApproved() { return autoApproved; }
        public void setAutoApproved(Boolean autoApproved) { this.autoApproved = autoApproved; }

        public String getExtractedName() { return extractedName; }
        public void setExtractedName(String extractedName) { this.extractedName = extractedName; }

        public String getExtractedSurname() { return extractedSurname; }
        public void setExtractedSurname(String extractedSurname) { this.extractedSurname = extractedSurname; }

        public String getExtractedIdNumber() { return extractedIdNumber; }
        public void setExtractedIdNumber(String extractedIdNumber) { this.extractedIdNumber = extractedIdNumber; }

        public String getExtractedLicenseNumber() { return extractedLicenseNumber; }
        public void setExtractedLicenseNumber(String extractedLicenseNumber) { this.extractedLicenseNumber = extractedLicenseNumber; }

        public String getExtractedBirthDate() { return extractedBirthDate; }
        public void setExtractedBirthDate(String extractedBirthDate) { this.extractedBirthDate = extractedBirthDate; }

        public String getExtractedExpiryDate() { return extractedExpiryDate; }
        public void setExtractedExpiryDate(String extractedExpiryDate) { this.extractedExpiryDate = extractedExpiryDate; }

        public java.time.LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(java.time.LocalDateTime createdAt) { this.createdAt = createdAt; }

        public java.time.LocalDateTime getUpdatedAt() { return updatedAt; }
        public void setUpdatedAt(java.time.LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    }
} 