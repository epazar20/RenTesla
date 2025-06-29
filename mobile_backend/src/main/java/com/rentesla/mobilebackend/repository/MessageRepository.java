package com.rentesla.mobilebackend.repository;

import com.rentesla.mobilebackend.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByReservationId(Long reservationId);

    @Query("SELECT m FROM Message m WHERE m.reservationId = :reservationId " +
           "AND m.isDeleted = false ORDER BY m.timestamp ASC")
    List<Message> findByReservationIdAndNotDeleted(@Param("reservationId") Long reservationId);

    @Query("SELECT m FROM Message m WHERE m.reservationId = :reservationId " +
           "AND m.isDeleted = false ORDER BY m.timestamp DESC")
    List<Message> findByReservationIdOrderByTimestampDesc(@Param("reservationId") Long reservationId);

    List<Message> findBySenderId(Long senderId);

    List<Message> findByReceiverId(Long receiverId);

    @Query("SELECT m FROM Message m WHERE (m.senderId = :userId OR m.receiverId = :userId) " +
           "AND m.isDeleted = false ORDER BY m.timestamp DESC")
    List<Message> findUserMessages(@Param("userId") Long userId);

    @Query("SELECT m FROM Message m WHERE m.reservationId = :reservationId " +
           "AND m.receiverId = :userId AND m.isRead = false AND m.isDeleted = false")
    List<Message> findUnreadMessagesByReservationAndUser(@Param("reservationId") Long reservationId,
                                                        @Param("userId") Long userId);

    @Query("SELECT m FROM Message m WHERE m.receiverId = :userId AND m.isRead = false " +
           "AND m.isDeleted = false ORDER BY m.timestamp DESC")
    List<Message> findUnreadMessagesByUser(@Param("userId") Long userId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.receiverId = :userId AND m.isRead = false " +
           "AND m.isDeleted = false")
    long countUnreadMessagesByUser(@Param("userId") Long userId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.reservationId = :reservationId " +
           "AND m.receiverId = :userId AND m.isRead = false AND m.isDeleted = false")
    long countUnreadMessagesByReservationAndUser(@Param("reservationId") Long reservationId,
                                                @Param("userId") Long userId);

    @Modifying
    @Query("UPDATE Message m SET m.isRead = true, m.readAt = :readAt " +
           "WHERE m.reservationId = :reservationId AND m.receiverId = :userId AND m.isRead = false")
    int markMessagesAsRead(@Param("reservationId") Long reservationId,
                          @Param("userId") Long userId,
                          @Param("readAt") LocalDateTime readAt);

    @Modifying
    @Query("UPDATE Message m SET m.isDeleted = true, m.deletedAt = :deletedAt, m.deletedBy = :deletedBy " +
           "WHERE m.id = :messageId")
    int markMessageAsDeleted(@Param("messageId") Long messageId,
                            @Param("deletedAt") LocalDateTime deletedAt,
                            @Param("deletedBy") Long deletedBy);

    @Query("SELECT m FROM Message m WHERE m.isSystemMessage = true AND m.reservationId = :reservationId " +
           "ORDER BY m.timestamp ASC")
    List<Message> findSystemMessagesByReservation(@Param("reservationId") Long reservationId);

    @Query("SELECT m FROM Message m WHERE m.messageType = :messageType AND m.isDeleted = false " +
           "ORDER BY m.timestamp DESC")
    List<Message> findByMessageType(@Param("messageType") Message.MessageType messageType);

    @Query("SELECT m FROM Message m WHERE m.replyToMessageId = :parentMessageId AND m.isDeleted = false " +
           "ORDER BY m.timestamp ASC")
    List<Message> findRepliesByParentMessage(@Param("parentMessageId") Long parentMessageId);

    // Statistics
    @Query("SELECT COUNT(m) FROM Message m WHERE m.reservationId = :reservationId AND m.isDeleted = false")
    long countMessagesByReservation(@Param("reservationId") Long reservationId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.senderId = :userId OR m.receiverId = :userId")
    long countMessagesByUser(@Param("userId") Long userId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.timestamp >= :fromDate AND m.timestamp <= :toDate")
    long countMessagesByDateRange(@Param("fromDate") LocalDateTime fromDate,
                                 @Param("toDate") LocalDateTime toDate);

    // Recent conversations
    @Query("SELECT DISTINCT m.reservationId FROM Message m WHERE (m.senderId = :userId OR m.receiverId = :userId) " +
           "AND m.isDeleted = false ORDER BY m.timestamp DESC")
    List<Long> findRecentConversationsByUser(@Param("userId") Long userId);
} 