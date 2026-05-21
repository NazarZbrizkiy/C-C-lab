#include <iostream>
#include <string>
#include <stack>
#include <stdexcept>

using namespace std;

namespace MyNamespace {

    template <typename T>
    T findMax(T a, T b) {
        return (a > b) ? a : b;
    }

    class RationalFraction {
        int numerator;
        int denominator;
    public:
        RationalFraction(int n = 0, int d = 1) : numerator(n), denominator(d) {
            if (d == 0) throw invalid_argument("Denominator cannot be 0");
        }
        bool operator>(const RationalFraction& other) const {
            return (numerator * other.denominator) > (other.numerator * denominator);
        }
        friend ostream& operator<<(ostream& os, const RationalFraction& frac) {
            os << frac.numerator << "/" << frac.denominator;
            return os;
        }
    };

    template <typename T>
    class Node {
    public:
        T data;
        Node* next;
        Node(T val) : data(val), next(nullptr) {}
    };

    template <typename T>
    class CustomStack {
        Node<T>* head;
        int count;
    public:
        CustomStack() : head(nullptr), count(0) {}
        
        ~CustomStack() {
            while (!isEmpty()) pop();
        }
        
        void push(T val) {
            Node<T>* newNode = new Node<T>(val);
            newNode->next = head;
            head = newNode;
            count++;
        }
        
        void pop() {
            if (isEmpty()) throw out_of_range("Stack underflow");
            Node<T>* temp = head;
            head = head->next;
            delete temp;
            count--;
        }
        
        T top() const {
            if (isEmpty()) throw out_of_range("Stack is empty");
            return head->data;
        }
        
        bool isEmpty() const {
            return head == nullptr;
        }
        
        int size() const {
            return count;
        }
    };

    int fillIntStack(CustomStack<int>& st) {
        int val;
        int count = 0;
        cout << "Enter integers (0 to stop): ";
        while (cin >> val && val != 0) {
            st.push(val);
            count++;
        }
        return count;
    }

    int fillDoubleStack(stack<double>& st) {
        double val;
        int count = 0;
        cout << "Enter doubles (0 to stop): ";
        while (cin >> val && val != 0.0) {
            st.push(val);
            count++;
        }
        return count;
    }
}

void task1() {
    int i1 = 10, i2 = 20;
    cout << "Max int: " << MyNamespace::findMax(i1, i2) << "\n";

    double d1 = 5.5, d2 = 3.14;
    cout << "Max double: " << MyNamespace::findMax(d1, d2) << "\n";

    string s1 = "Apple", s2 = "Banana";
    cout << "Max string: " << MyNamespace::findMax(s1, s2) << "\n";

    MyNamespace::RationalFraction f1(1, 2);
    MyNamespace::RationalFraction f2(3, 4);
    cout << "Max RationalFraction: " << MyNamespace::findMax(f1, f2) << "\n";
}

void task2() {
    MyNamespace::CustomStack<int> myStack;
    int intCount = MyNamespace::fillIntStack(myStack);
    
    cout << "CustomStack count returned: " << intCount << "\n";
    cout << "CustomStack content (top to bottom): ";
    while (!myStack.isEmpty()) {
        cout << myStack.top() << " ";
        myStack.pop();
    }
    cout << "\n\n";

    stack<double> stlStack;
    int doubleCount = MyNamespace::fillDoubleStack(stlStack);
    
    cout << "STL Stack count returned: " << doubleCount << "\n";
    cout << "STL Stack content (top to bottom): ";
    while (!stlStack.empty()) {
        cout << stlStack.top() << " ";
        stlStack.pop();
    }
    cout << "\n";
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