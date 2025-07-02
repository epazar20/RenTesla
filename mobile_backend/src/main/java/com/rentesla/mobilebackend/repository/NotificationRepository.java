package com.rentesla.mobilebackend.repository;

import com.rentesla.mobilebackend.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /**
     * Find notifications by user ID, ordered by sent date descending
     */
    List<Notification> findByUserIdOrderBySentAtDesc(Long userId);

    /**
     * Find notifications by user ID and type
     */
    List<Notification> findByUserIdAndType(Long userId, String type);

    /**
     * Find undelivered notifications
     */
    List<Notification> findByDeliveredFalse();

    /**
     * Find notifications that need retry (failed and retry count < max)
     */
    @Query("SELECT n FROM Notification n WHERE n.delivered = false AND n.retryCount < :maxRetries AND n.errorMessage IS NOT NULL")
    List<Notification> findNotificationsForRetry(@Param("maxRetries") int maxRetries);

    /**
     * Find notifications sent within a time range
     */
    @Query("SELECT n FROM Notification n WHERE n.sentAt BETWEEN :startTime AND :endTime")
    List<Notification> findBySentAtBetween(@Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime);

    /**
     * Get notification statistics by type for the last N days
     */
    @Query("SELECT n.type, COUNT(n), " +
           "SUM(CASE WHEN n.delivered = true THEN 1 ELSE 0 END), " +
           "SUM(CASE WHEN n.opened = true THEN 1 ELSE 0 END) " +
           "FROM Notification n " +
           "WHERE n.sentAt >= :since " +
           "GROUP BY n.type")
    List<Object[]> getNotificationStatistics(@Param("since") LocalDateTime since);

    /**
     * Count unread notifications for a user
     */
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.userId = :userId AND n.opened = false")
    Long countUnreadNotifications(@Param("userId") Long userId);

    /**
     * Find notifications by type and date range
     */
    @Query("SELECT n FROM Notification n WHERE n.type = :type AND n.sentAt >= :since ORDER BY n.sentAt DESC")
    List<Notification> findByTypeAndSentAtAfter(@Param("type") String type, @Param("since") LocalDateTime since);

    /**
     * Delete old notifications (cleanup)
     */
    @Query("DELETE FROM Notification n WHERE n.sentAt < :cutoffDate")
    void deleteOldNotifications(@Param("cutoffDate") LocalDateTime cutoffDate);

    /**
     * Find latest notification for user by type
     */
    @Query("SELECT n FROM Notification n WHERE n.userId = :userId AND n.type = :type ORDER BY n.sentAt DESC LIMIT 1")
    Notification findLatestByUserIdAndType(@Param("userId") Long userId, @Param("type") String type);
} 
 