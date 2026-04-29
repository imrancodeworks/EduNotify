#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <string>
#include <iomanip>
#include <thread>
#include <chrono>

using namespace std;

// Structure to hold student data
struct Student {
    string name;
    string parentPhone;
    string parentEmail;
    vector<int> marks;
    int totalMarks;
    float average;
    string performance;
    string message;
};

// Helper function to split a string by a delimiter
vector<string> split(const string& str, char delimiter) {
    vector<string> tokens;
    string token;
    istringstream tokenStream(str);
    while (getline(tokenStream, token, delimiter)) {
        tokens.push_back(token);
    }
    return tokens;
}

int main() {
    cout << "\n======================================================\n";
    cout << "   Automated Student Performance & Notification System   \n";
    cout << "======================================================\n\n";
    
    // Step 1 & 2: Read Input File
    cout << "[1/4] Reading Input File (students.csv)..." << endl;
    ifstream file("students.csv");
    if (!file.is_open()) {
        cerr << "Error: Could not open students.csv! Please ensure the file exists." << endl;
        return 1;
    }

    string line;
    vector<Student> students;
    vector<string> subjects;

    // Extract headers (subjects)
    if (getline(file, line)) {
        vector<string> headers = split(line, ',');
        for (size_t i = 3; i < headers.size(); ++i) {
            subjects.push_back(headers[i]);
        }
    }

    // Step 3: Process Marks
    cout << "[2/4] Processing Student Marks and Averages..." << endl;
    while (getline(file, line)) {
        if (line.empty()) continue;

        vector<string> data = split(line, ',');
        if (data.size() < 3) continue;

        Student s;
        s.name = data[0];
        s.parentPhone = data[1];
        s.parentEmail = data[2];
        s.totalMarks = 0;

        for (size_t i = 3; i < data.size(); ++i) {
            int mark = stoi(data[i]);
            s.marks.push_back(mark);
            s.totalMarks += mark;
        }

        s.average = (float)s.totalMarks / subjects.size();
        
        // Step 4: Analyze Performance (AI Logic Categorization)
        if (s.average >= 85.0) {
            s.performance = "Distinction";
        } else if (s.average >= 70.0) {
            s.performance = "Good";
        } else if (s.average >= 50.0) {
            s.performance = "Average";
        } else {
            s.performance = "Poor";
        }

        // Step 5: Generate Message
        stringstream msg;
        msg << "Dear Parent, " << s.name << " scored " << s.totalMarks 
            << "/" << (subjects.size() * 100) << " (" << fixed << setprecision(1) << s.average << "%). ";

        if (s.performance == "Distinction" || s.performance == "Good") {
            msg << "Performance is " << s.performance << ". Excellent work!";
        } else if (s.performance == "Average") {
            msg << "Performance is Average. Focus needed on weaker subjects to improve.";
        } else {
            msg << "Performance is Poor. Please arrange a meeting with the class advisor.";
        }
        
        s.message = msg.str();
        students.push_back(s);
    }
    file.close();
    
    // Simulate processing time for realistic effect
    this_thread::sleep_for(chrono::seconds(1));
    cout << "[3/4] AI Logic: Performance Categorized and Messages Generated." << endl;
    
    // Step 6: Send / Display Notification
    cout << "[4/4] Initiating Automated Dispatch Process...\n" << endl;
    this_thread::sleep_for(chrono::seconds(1));

    for (const auto& s : students) {
        cout << "------------------------------------------------------\n";
        cout << "Student : " << s.name << "\n";
        cout << "Grade   : " << s.performance << " (" << s.average << "%)\n";
        cout << "Message : " << s.message << "\n";
        cout << "Dispatch: Routing to " << s.parentPhone << " ... ";
        
        // Simulate network delay for sending
        this_thread::sleep_for(chrono::milliseconds(600)); 
        
        cout << "[Sent Successfully]" << endl;
    }

    cout << "------------------------------------------------------\n";
    cout << "\nTask Complete! " << students.size() << " notifications processed and dispatched.\n";

    return 0;
}
