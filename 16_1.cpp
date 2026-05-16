#include <iostream>
#include <string>
#include <fstream>

using namespace std;

class Person {
protected:
    string name;
    unsigned byear;

public:
    Person() : name(""), byear(0) {}
    Person(string n, unsigned y) : name(n), byear(y) {}
    virtual ~Person() {}

    virtual int input() {
        cout << "Enter name: ";
        cin >> name;
        cout << "Enter birth year: ";
        cin >> byear;
        return 1;
    }

    virtual void show() const {
        cout << "Name: " << name << ", Birth year: " << byear << endl;
    }

    friend istream& operator>>(istream& is, Person& p) {
        is >> p.name >> p.byear;
        return is;
    }

    friend ostream& operator<<(ostream& os, const Person& p) {
        os << p.name << " " << p.byear;
        return os;
    }

    string getName() const {
        return name;
    }
};

class Acquaintance : public Person {
private:
    string phone;

public:
    Acquaintance() : Person(), phone("") {}
    Acquaintance(string n, unsigned y, string p) : Person(n, y), phone(p) {}

    int input() override {
        Person::input();
        cout << "Enter phone number: ";
        cin >> phone;
        return 1;
    }

    void show() const override {
        cout << "Name: " << name << ", Birth year: " << byear << ", Phone: " << phone << endl;
    }

    friend istream& operator>>(istream& is, Acquaintance& a) {
        is >> a.name >> a.byear >> a.phone;
        return is;
    }

    friend ostream& operator<<(ostream& os, const Acquaintance& a) {
        os << a.name << " " << a.byear << " " << a.phone;
        return os;
    }

    void setPhone(const string& p) {
        phone = p;
    }

    string getPhone() const {
        return phone;
    }
};

class PhoneBook {
private:
    Acquaintance directory[100];
    int count;
    string filename;

    void loadFromFile() {
        ifstream file(filename);
        if (file.is_open()) {
            count = 0;
            while (count < 100 && file >> directory[count]) {
                count++;
            }
            file.close();
        }
    }

    void saveToFile() {
        ofstream file(filename);
        if (file.is_open()) {
            for (int i = 0; i < count; i++) {
                file << directory[i] << endl;
            }
            file.close();
        }
    }

public:
    PhoneBook(const string& fn) : count(0), filename(fn) {
        loadFromFile();
    }

    void addRecord() {
        if (count < 100) {
            directory[count].input();
            count++;
            saveToFile();
            cout << "Record added successfully.\n";
        } else {
            cout << "Phone book is full. Cannot add more records.\n";
        }
    }

    void searchByName(const string& targetName) {
        bool found = false;
        for (int i = 0; i < count; i++) {
            if (directory[i].getName() == targetName) {
                cout << "Record found:\n";
                directory[i].show();
                found = true;
            }
        }
        if (!found) {
            cout << "Record not found.\n";
        }
    }

    void changePhone(const string& targetName, const string& newPhone) {
        bool found = false;
        for (int i = 0; i < count; i++) {
            if (directory[i].getName() == targetName) {
                directory[i].setPhone(newPhone);
                found = true;
                cout << "Phone number updated successfully.\n";
            }
        }
        if (found) {
            saveToFile();
        } else {
            cout << "Record not found.\n";
        }
    }

    void displayAll() const {
        if (count == 0) {
            cout << "Phone book is empty.\n";
            return;
        }
        for (int i = 0; i < count; i++) {
            directory[i].show();
        }
    }
};

int main() {
    PhoneBook pb("phonebook.txt");
    int choice;
    string searchName, newPhone;

    while (true) {
        cout << "\n--- Phone Book Menu ---\n";
        cout << "1. Add a new record\n";
        cout << "2. Search by name\n";
        cout << "3. Change phone number\n";
        cout << "4. Display all records\n";
        cout << "5. Exit\n";
        cout << "Enter your choice: ";
        
        if (!(cin >> choice)) {
            break;
        }

        switch (choice) {
            case 1:
                pb.addRecord();
                break;
            case 2:
                cout << "Enter name to search: ";
                cin >> searchName;
                pb.searchByName(searchName);
                break;
            case 3:
                cout << "Enter name to update: ";
                cin >> searchName;
                cout << "Enter new phone number: ";
                cin >> newPhone;
                pb.changePhone(searchName, newPhone);
                break;
            case 4:
                pb.displayAll();
                break;
            case 5:
                cout << "Exiting program...\n";
                return 0;
            default:
                cout << "Invalid choice. Please try again.\n";
        }
    }

    return 0;
}