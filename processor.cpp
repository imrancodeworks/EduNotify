#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <string>
#include <iomanip>
#include <algorithm>
#include <cmath>
#include <set>

using namespace std;

// helper to trim whitespace
string trim(const string& s) {
    size_t start = s.find_first_not_of(" \t\r\n");
    size_t end   = s.find_last_not_of(" \t\r\n");
    return (start == string::npos) ? "" : s.substr(start, end - start + 1);
}

// split string by delimiter
vector<string> split(const string& str, char delimiter) {
    vector<string> tokens;
    string token;
    istringstream tokenStream(str);
    while (getline(tokenStream, token, delimiter)) {
        tokens.push_back(trim(token));
    }
    return tokens;
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        cerr << "{\"error\": \"Missing CSV file argument\"}" << endl;
        return 1;
    }

    ifstream file(argv[1]);
    if (!file.is_open()) {
        cerr << "{\"error\": \"Could not open file\"}" << endl;
        return 1;
    }

    string line;
    vector<string> subjects;
    int phoneCol = -1, emailCol = -1, marksStartCol = 1;

    auto toLower = [](string s) { 
        transform(s.begin(), s.end(), s.begin(), ::tolower); 
        return s; 
    };

    // parse header row to find columns
    if (getline(file, line)) {
        vector<string> headers = split(line, ',');
        for (int i = 1; i < (int)headers.size(); ++i) {
            string h = toLower(headers[i]);
            if ((h.find("email") != string::npos || h.find("mail") != string::npos) && emailCol == -1)
                emailCol = i;
            else if ((h.find("phone") != string::npos || h.find("mobile") != string::npos ||
                      h.find("contact") != string::npos || h.find("number") != string::npos) && phoneCol == -1)
                phoneCol = i;
        }
        
        // figure out where subject marks start
        set<int> knownCols = {0};
        if (phoneCol != -1) knownCols.insert(phoneCol);
        if (emailCol  != -1) knownCols.insert(emailCol);
        
        marksStartCol = 1;
        for (int i = 1; i < (int)headers.size(); ++i) {
            if (knownCols.find(i) == knownCols.end()) { 
                marksStartCol = i; 
                break; 
            }
        }
        
        for (int i = marksStartCol; i < (int)headers.size(); ++i) {
            string h = toLower(headers[i]);
            if (!headers[i].empty() && h.find("email") == string::npos && h.find("phone") == string::npos)
                subjects.push_back(headers[i]);
        }
    }

    int numSubjects = (int)subjects.size();
    int maxPerSubject = 100;
    int maxTotal = numSubjects * maxPerSubject;

    cout << "["; 
    bool first = true;

    // loop through each student record
    while (getline(file, line)) {
        if (trim(line).empty()) continue;
        
        vector<string> data = split(line, ',');
        if (data.size() < 3) continue;

        string name  = data[0];
        string phone = (phoneCol != -1 && phoneCol < (int)data.size()) ? data[phoneCol] : "";
        string email = (emailCol  != -1 && emailCol  < (int)data.size()) ? data[emailCol]  : "";

        // fallback: check if value looks like an email or phone number if headers were missing
        if (phone.empty() && email.empty() && phoneCol == -1 && emailCol == -1) {
            if (data.size() > 1 && data[1].find('@') != string::npos) email = data[1];
            else if (data.size() > 1) phone = data[1];
            if (data.size() > 2 && data[2].find('@') != string::npos) email = data[2];
        }

        int total = 0;
        vector<pair<string, int>> marksList;

        // extract marks
        for (int i = 0; i < numSubjects; ++i) {
            int col = marksStartCol + i;
            int mark = 0;
            if (col < (int)data.size() && !data[col].empty()) {
                try { 
                    mark = stoi(data[col]); 
                } catch (...) { 
                    mark = 0; 
                }
                
                // keep marks between 0 and 100
                if (mark < 0) mark = 0;
                if (mark > 100) mark = 100;
            }
            total += mark;
            marksList.push_back({subjects[i], mark});
        }

        // calc percentage
        float percentage = (numSubjects > 0) ? ((float)total / (float)maxTotal) * 100.0f : 0.0f;
        percentage = roundf(percentage * 10.0f) / 10.0f;

        // assign grade based on percentage
        string grade, gradeColor, gradeBg;
        if (percentage >= 85.0f) { 
            grade = "Distinction"; 
            gradeColor = "#B153D7"; 
            gradeBg = "rgba(177, 83, 215, 0.15)"; 
        } else if (percentage >= 70.0f) { 
            grade = "Good"; 
            gradeColor = "#F9B2D7"; 
            gradeBg = "rgba(249, 178, 215, 0.3)"; 
        } else if (percentage >= 50.0f) { 
            grade = "Average"; 
            gradeColor = "#FFB399"; 
            gradeBg = "rgba(255, 179, 153, 0.3)"; 
        } else { 
            grade = "Poor"; 
            gradeColor = "#607274"; 
            gradeBg = "rgba(96, 114, 116, 0.15)"; 
        }

        // dump student JSON
        cout << (first ? "" : ",") << "\n  {";
        first = false;

        cout << "\"name\": \""  << name  << "\", ";
        cout << "\"phone\": \"" << phone << "\", ";
        cout << "\"email\": \"" << email << "\", ";

        cout << "\"marks\": [";
        for (int i = 0; i < (int)marksList.size(); ++i) {
            cout << "{\"subject\": \"" << marksList[i].first << "\", \"mark\": " << marksList[i].second << "}";
            if (i < (int)marksList.size() - 1) cout << ", ";
        }
        cout << "], ";

        cout << "\"total\": "       << total          << ", ";
        cout << "\"max\": "         << maxTotal        << ", ";
        cout << "\"numSubjects\": " << numSubjects     << ", ";
        cout << "\"avg\": "         << fixed << setprecision(1) << percentage << ", ";
        cout << "\"grade\": \""     << grade           << "\", ";
        cout << "\"gradeColor\": \"" << gradeColor     << "\", ";
        cout << "\"gradeBg\": \""   << gradeBg         << "\"";
        cout << "}";
    }

    cout << "\n]" << endl;
    return 0;
}
