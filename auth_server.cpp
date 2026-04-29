/**
 * @file auth_server.cpp
 * @brief Staff Authentication System
 * @description A lightweight C++ web server using the Crow framework. 
 * Handles user Sign Up, Login, and Password Resets.
 */

#include "crow.h"
#include <iostream>
#include <string>
#include <regex>
#include <unordered_map>

using namespace std;

// ============================================================================
// 1. DATA STRUCTURES & MOCK DATABASE
// ============================================================================

struct Staff {
    string name;
    string email;
    string passwordHash;
};

// Mock Database: Maps email to Staff object for fast O(1) lookups
unordered_map<string, Staff> staffDatabase;

// ============================================================================
// 2. SECURITY UTILITIES
// ============================================================================

/**
 * @brief Placeholder for SHA-256 password hashing.
 * @note In a production environment, use a robust library like OpenSSL or Argon2.
 */
string hashPassword(const string& plainText) {
    // SECURITY WARNING: This is a mock hash. Do NOT use in production.
    return "SHA256_HASH_OF_[" + plainText + "]";
}

// ============================================================================
// 3. VALIDATION UTILITIES
// ============================================================================

bool isValidEmail(const string& email) {
    const regex emailPattern(R"(^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$)");
    return regex_match(email, emailPattern);
}

bool isValidPassword(const string& password) {
    // Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const regex passwordPattern(R"(^(?=.*[A-Z])(?=.*[!@#$&*])(?=.*[0-9])(?=.*[a-z]).{8,}$)");
    return regex_match(password, passwordPattern);
}

// ============================================================================
// 4. MAIN APPLICATION
// ============================================================================

int main() {
    // Initialize the Crow Application
    crow::SimpleApp app;

    // ------------------------------------------------------------------------
    // ROUTE 1: SIGN UP
    // Expects JSON: { "name": "...", "email": "...", "password": "..." }
    // ------------------------------------------------------------------------
    CROW_ROUTE(app, "/signup").methods(crow::HTTPMethod::POST)([](const crow::request& req) {
        auto body = crow::json::load(req.body);
        if (!body || !body.has("name") || !body.has("email") || !body.has("password")) {
            return crow::response(400, "Invalid JSON structure. Required: name, email, password.");
        }

        string name = body["name"].s();
        string email = body["email"].s();
        string password = body["password"].s();

        // Validate Input Formatting
        if (!isValidEmail(email)) {
            return crow::response(400, "Error: Invalid email format.");
        }
        if (!isValidPassword(password)) {
            return crow::response(400, "Error: Password must be at least 8 chars, with 1 uppercase, 1 lowercase, 1 number, and 1 special character.");
        }

        // Check if user already exists in the mock database
        if (staffDatabase.find(email) != staffDatabase.end()) {
            return crow::response(409, "Error: Email already registered.");
        }

        // Save User securely
        Staff newStaff = {name, email, hashPassword(password)};
        staffDatabase[email] = newStaff;

        return crow::response(201, "Sign up successful! Account created.");
    });

    // ------------------------------------------------------------------------
    // ROUTE 2: LOGIN
    // Expects JSON: { "email": "...", "password": "..." }
    // ------------------------------------------------------------------------
    CROW_ROUTE(app, "/login").methods(crow::HTTPMethod::POST)([](const crow::request& req) {
        auto body = crow::json::load(req.body);
        if (!body || !body.has("email") || !body.has("password")) {
            return crow::response(400, "Invalid JSON structure. Required: email, password.");
        }

        string email = body["email"].s();
        string password = body["password"].s();

        // Lookup the user in the database
        auto it = staffDatabase.find(email);
        if (it == staffDatabase.end()) {
            return crow::response(401, "Authentication failed: Email not found.");
        }

        // Verify Hash against stored Hash
        if (it->second.passwordHash != hashPassword(password)) {
            return crow::response(401, "Authentication failed: Incorrect password.");
        }

        // Success - Provide welcome message (in a real app, you would return a JWT session token here)
        return crow::response(200, "Login successful! Welcome, " + it->second.name);
    });

    // ------------------------------------------------------------------------
    // ROUTE 3: FORGOT PASSWORD
    // Expects JSON: { "email": "..." }
    // ------------------------------------------------------------------------
    CROW_ROUTE(app, "/forgot-password").methods(crow::HTTPMethod::POST)([](const crow::request& req) {
        auto body = crow::json::load(req.body);
        if (!body || !body.has("email")) {
            return crow::response(400, "Invalid JSON structure. Required: email.");
        }

        string email = body["email"].s();

        // Check Database for the email
        if (staffDatabase.find(email) != staffDatabase.end()) {
            // Simulate Email Sending
            // In production, use libcurl to call an SMTP API (SendGrid, Mailgun)
            cout << "[SYSTEM] Email Sent to " << email << " with password reset link." << endl;
        }

        // Security Best Practice: Always return a generic success message
        // This prevents "User Enumeration" attacks where hackers test random emails
        return crow::response(200, "If the email exists in our system, a reset link has been sent.");
    });

    // ------------------------------------------------------------------------
    // BOOT SERVER
    // ------------------------------------------------------------------------
    cout << "\n=======================================================\n";
    cout << " 🚀 Staff Authentication API starting on port 8080..." << endl;
    cout << "=======================================================\n";
    
    app.port(8080).multithreaded().run();

    return 0;
}
