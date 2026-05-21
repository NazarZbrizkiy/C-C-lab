#include <iostream>
#include <fstream>
#include <stdexcept>
#include <string>
#include <vector>

using namespace std;

class RationalFraction {
    int numerator;
    int denominator;

public:
    RationalFraction(int num = 0, int den = 1) {
        if (den == 0) throw invalid_argument("Denominator cannot be zero upon initialization.");
        numerator = num;
        denominator = den;
    }

    void setNumerator(int num) { 
        numerator = num; 
    }
    
    void setDenominator(int den) {
        if (den == 0) throw invalid_argument("Denominator cannot be zero in setter.");
        denominator = den;
    }

    RationalFraction operator-(const RationalFraction& other) const {
        return RationalFraction(numerator * other.denominator - other.numerator * denominator,
                                denominator * other.denominator);
    }

    RationalFraction operator-() const {
        return RationalFraction(-numerator, denominator);
    }

    RationalFraction operator/(const RationalFraction& other) const {
        if (other.numerator == 0) throw invalid_argument("Division by zero fraction is not allowed.");
        return RationalFraction(numerator * other.denominator, denominator * other.numerator);
    }

    friend istream& operator>>(istream& is, RationalFraction& frac) {
        int n, d;
        is >> n >> d;
        if (d == 0) throw invalid_argument("Denominator cannot be zero during input.");
        frac.numerator = n;
        frac.denominator = d;
        return is;
    }

    friend ostream& operator<<(ostream& os, const RationalFraction& frac) {
        os << frac.numerator << "/" << frac.denominator;
        return os;
    }

    friend void writeToFile(const RationalFraction& frac, const string& filename) {
        ofstream outFile(filename);
        if (!outFile.is_open()) {
            throw runtime_error("Failed to open file for writing.");
        }
        outFile << frac.numerator << "/" << frac.denominator;
        outFile.close();
    }
};

void task1() {
    try {
        RationalFraction f1(3, 4);
        RationalFraction f2(1, 2);
        
        cout << "f1: " << f1 << endl;
        cout << "f2: " << f2 << endl;
        cout << "Binary minus (f1 - f2): " << f1 - f2 << endl;
        cout << "Unary minus (-f1): " << -f1 << endl;
        cout << "Division (f1 / f2): " << f1 / f2 << endl;

        RationalFraction f3;
        cout << "Enter fraction (numerator denominator): ";
        cin >> f3;
        cout << "You entered: " << f3 << endl;

        writeToFile(f3, "output.txt");
        cout << "Fraction written to output.txt successfully." << endl;

        writeToFile(f3, "Z:/invalid_drive/output.txt");

    } catch (const exception& e) {
        cout << "Error caught in task1: " << e.what() << endl;
    }

    try {
        cout << "Attempting to create fraction with zero denominator..." << endl;
        RationalFraction f4(5, 0);
    } catch (const exception& e) {
        cout << "Error caught during initialization: " << e.what() << endl;
    }
}

class Person {
protected:
    string name;
    string gender;
    int age;
public:
    Person(string n = "Unknown", string g = "Unknown", int a = 0) : name(n), gender(g), age(a) {}
    virtual ~Person() = default;

    virtual void input() {
        cout << "Enter Name, Gender, Age: ";
        cin >> name >> gender >> age;
        if (cin.fail() || age < 0) {
            cin.clear();
            throw invalid_argument("Invalid input for Person.");
        }
    }

    virtual void print() const {
        cout << "Name: " << name << ", Gender: " << gender << ", Age: " << age << endl;
    }

    virtual string getUniversity() const {
        return "No University";
    }
};

class Student : virtual public Person {
protected:
    int course;
    string group;
    string university;
public:
    Student(string n = "Unknown", string g = "Unknown", int a = 0, int c = 1, string grp = "None", string uni = "None")
        : Person(n, g, a), course(c), group(grp), university(uni) {}
    
    void input() override {
        Person::input();
        cout << "Enter Course, Group, University: ";
        cin >> course >> group >> university;
        if (cin.fail() || course < 1) {
            cin.clear();
            throw invalid_argument("Invalid input for Student.");
        }
    }
    
    void print() const override {
        Person::print();
        cout << "Course: " << course << ", Group: " << group << ", University: " << university << endl;
    }

    string getUniversity() const override {
        return university;
    }
};

class Teacher : virtual public Person {
protected:
    string university;
    string position;
    double salary;
public:
    Teacher(string n = "Unknown", string g = "Unknown", int a = 0, string uni = "None", string pos = "None", double sal = 0.0)
        : Person(n, g, a), university(uni), position(pos), salary(sal) {}

    void input() override {
        Person::input();
        cout << "Enter University, Position, Salary: ";
        cin >> university >> position >> salary;
        if (cin.fail() || salary < 0) {
            cin.clear();
            throw invalid_argument("Invalid input for Teacher.");
        }
    }

    void print() const override {
        Person::print();
        cout << "University: " << university << ", Position: " << position << ", Salary: " << salary << endl;
    }

    string getUniversity() const override {
        return university;
    }
};

class GraduateStudent : public Student, public Teacher {
public:
    GraduateStudent(string n = "Unknown", string g = "Unknown", int a = 0, int c = 1, string grp = "None", string uni = "None", string pos = "None", double sal = 0.0)
        : Person(n, g, a), Student(n, g, a, c, grp, uni), Teacher(n, g, a, uni, pos, sal) {}

    void input() override {
        Person::input();
        cout << "Enter Course, Group, University, Position, Salary: ";
        string uni;
        cin >> course >> group >> uni >> position >> salary;
        if (cin.fail() || course < 1 || salary < 0) {
            cin.clear();
            throw invalid_argument("Invalid input for GraduateStudent.");
        }
        Student::university = uni;
        Teacher::university = uni;
    }

    void print() const override {
        Person::print();
        cout << "Course: " << course << ", Group: " << group 
             << ", University: " << Student::university 
             << ", Position: " << position << ", Salary: " << salary << endl;
    }

    string getUniversity() const override {
        return Student::university;
    }
};

void task2() {
    vector<Person*> people;
    
    try {
        int count;
        cout << "Enter the number of people to process: ";
        cin >> count;
        if (cin.fail() || count <= 0) throw invalid_argument("Invalid number of people.");

        for (int i = 0; i < count; ++i) {
            int type;
            cout << "\nEnter type (1 - Student, 2 - Teacher, 3 - Graduate Student): ";
            cin >> type;

            Person* p = nullptr;
            if (type == 1) p = new Student();
            else if (type == 2) p = new Teacher();
            else if (type == 3) p = new GraduateStudent();
            else throw invalid_argument("Unknown person type.");

            p->input();
            people.push_back(p);
        }

        cout << "\n--- Array Output ---" << endl;
        for (size_t i = 0; i < people.size(); ++i) {
            cout << "Person [" << i + 1 << "]:" << endl;
            people[i]->print();
            cout << "Extracted University: " << people[i]->getUniversity() << "\n" << endl;
        }

    } catch (const exception& e) {
        cout << "Fatal Error: " << e.what() << endl;
    }

    for (Person* p : people) {
        delete p;
    }
}

int main() {
    int choice;
    cout << "Select task to run (1 or 2, 0 to exit): ";
    while (cin >> choice && choice != 0) {
        if (choice == 1) {
            cout << "\n--- Running Task 1 ---\n";
            task1();
        } else if (choice == 2) {
            cout << "\n--- Running Task 2 ---\n";
            task2();
        } else {
            cout << "Invalid choice.\n";
        }
        cout << "\nSelect task to run (1 or 2, 0 to exit): ";
    }
    return 0;
}