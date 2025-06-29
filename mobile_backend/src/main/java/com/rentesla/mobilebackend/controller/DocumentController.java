package com.rentesla.mobilebackend.controller;

import com.rentesla.mobilebackend.entity.Document;
import com.rentesla.mobilebackend.service.DocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/documents")
@Tag(name = "Document Management", description = "Document upload and verification operations")
@CrossOrigin(origins = "*")
public class DocumentController {

    @Autowired
    private DocumentService documentService;

    @PostMapping("/upload")
    @Operation(summary = "Upload document", description = "Upload document with OCR processing")
    public ResponseEntity<Document> uploadDocument(@RequestBody DocumentUploadRequest request) {
        try {
            Document document = documentService.uploadDocument(
                request.getUserId(),
                request.getDocumentType(),
                request.getImageBase64(),
                request.getFileName(),
                request.getFace()
            );
            return ResponseEntity.ok(document);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Get user documents", description = "Get all documents for a specific user")
    public ResponseEntity<List<Document>> getUserDocuments(
            @Parameter(description = "User ID") @PathVariable Long userId) {
        List<Document> documents = documentService.getUserDocuments(userId);
        return ResponseEntity.ok(documents);
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
} 