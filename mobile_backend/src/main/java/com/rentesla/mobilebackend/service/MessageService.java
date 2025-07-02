package com.rentesla.mobilebackend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class MessageService {

    @Autowired
    private MessageSource messageSource;

    public String getMessage(String code) {
        return getMessage(code, (Object[]) null);
    }

    public String getMessage(String code, Object[] args) {
        return getMessage(code, args, LocaleContextHolder.getLocale());
    }

    public String getMessage(String code, Object[] args, Locale locale) {
        return messageSource.getMessage(code, args, code, locale);
    }

    public String getMessageWithLocale(String code, Locale locale) {
        return getMessage(code, (Object[]) null, locale);
    }

    // Common error messages
    public String getValidationError() {
        return getMessage("error.validation");
    }

    public String getInvalidCredentials() {
        return getMessage("error.auth.invalid.credentials");
    }

    public String getTokenExpired() {
        return getMessage("error.auth.token.expired");
    }

    public String getAccessDenied() {
        return getMessage("error.auth.access.denied");
    }

    public String getAccountDisabled() {
        return getMessage("error.auth.account.disabled");
    }

    public String getEmailExists() {
        return getMessage("error.user.email.exists");
    }

    public String getPhoneExists() {
        return getMessage("error.user.phone.exists");
    }

    public String getInternalError() {
        return getMessage("error.internal");
    }

    public String getNetworkError() {
        return getMessage("error.network");
    }

    public String getServerError() {
        return getMessage("error.server");
    }

    // Success messages
    public String getLoginSuccess() {
        return getMessage("success.auth.login");
    }

    public String getSignupSuccess() {
        return getMessage("success.auth.signup");
    }

    public String getProfileUpdateSuccess() {
        return getMessage("success.profile.update");
    }

    public String getDocumentUploadSuccess() {
        return getMessage("success.document.upload");
    }

    // Validation messages
    public String getFieldRequired(String fieldName) {
        return getMessage("validation.field.required", new Object[]{fieldName});
    }

    public String getFieldInvalid(String fieldName) {
        return getMessage("validation.field.invalid", new Object[]{fieldName});
    }

    public String getFieldTooShort(String fieldName, int minLength) {
        return getMessage("validation.field.too.short", new Object[]{fieldName, minLength});
    }

    public String getFieldTooLong(String fieldName, int maxLength) {
        return getMessage("validation.field.too.long", new Object[]{fieldName, maxLength});
    }
} 