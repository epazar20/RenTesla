package com.rentesla.mobilebackend.repository;

import com.rentesla.mobilebackend.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findByUserId(Long userId);

    List<Document> findByUserIdAndType(Long userId, Document.DocumentType type);

    List<Document> findByStatus(Document.DocumentStatus status);

    List<Document> findByType(Document.DocumentType type);

    Optional<Document> findByUserIdAndTypeAndStatus(
            Long userId, 
            Document.DocumentType type, 
            Document.DocumentStatus status
    );

    @Query("SELECT d FROM Document d WHERE d.userId = :userId AND d.type = :type " +
           "AND d.status IN ('APPROVED', 'PENDING') ORDER BY d.createdAt DESC")
    Optional<Document> findLatestDocumentByUserAndType(@Param("userId") Long userId, 
                                                       @Param("type") Document.DocumentType type);

    @Query("SELECT d FROM Document d WHERE d.status = 'PENDING' ORDER BY d.createdAt ASC")
    List<Document> findPendingDocumentsForReview();

    @Query("SELECT d FROM Document d WHERE d.reviewedBy = :adminId ORDER BY d.updatedAt DESC")
    List<Document> findDocumentsReviewedByAdmin(@Param("adminId") Long adminId);

    @Query("SELECT COUNT(d) FROM Document d WHERE d.status = :status")
    long countByStatus(@Param("status") Document.DocumentStatus status);

    @Query("SELECT COUNT(d) FROM Document d WHERE d.type = :type AND d.status = 'APPROVED'")
    long countApprovedByType(@Param("type") Document.DocumentType type);

    @Query("SELECT d FROM Document d WHERE d.status = 'PENDING' AND d.createdAt < :cutoffDate")
    List<Document> findExpiredPendingDocuments(@Param("cutoffDate") LocalDateTime cutoffDate);

    boolean existsByUserIdAndTypeAndStatus(
            Long userId, 
            Document.DocumentType type, 
            Document.DocumentStatus status
    );

    @Query("SELECT CASE WHEN COUNT(d) > 0 THEN true ELSE false END FROM Document d " +
           "WHERE d.userId = :userId AND d.type = :type AND d.status = 'APPROVED'")
    boolean hasApprovedDocument(@Param("userId") Long userId, 
                               @Param("type") Document.DocumentType type);

    @Query("SELECT CASE WHEN COUNT(d) > 0 THEN true ELSE false END FROM Document d " +
           "WHERE d.userId = :userId AND d.status = 'APPROVED'")
    boolean hasAnyApprovedDocument(@Param("userId") Long userId);

    @Query("SELECT d FROM Document d WHERE d.ocrConfidence < :threshold AND d.status = 'PENDING'")
    List<Document> findDocumentsWithLowConfidence(@Param("threshold") Double threshold);
} 