#include <iostream>
#include <numeric>
#include <cmath>
#include <vector>
#include <string>
#include <fstream>

int custom_gcd(int a, int b) {
    while (b != 0) {
        int temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

class Rational {
private:
    int nominator;
    unsigned int denominator;

    void reduce() {
        int g = custom_gcd(std::abs(nominator), denominator);
        nominator /= g;
        denominator /= g;
    }

public:
    Rational() : nominator(1), denominator(1) {}

    Rational(int n, unsigned int d) {
        nominator = n;
        denominator = (d == 0) ? 1 : d;
        reduce();
    }

    void setNominator(int n) {
        nominator = n;
        reduce();
    }

    void setDenominator(unsigned int d) {
        if (d != 0) {
            denominator = d;
            reduce();
        }
    }

    void input() {
        std::cin >> nominator >> denominator;
        if (denominator == 0) denominator = 1;
        reduce();
    }

    void print() const {
        std::cout << nominator << "/" << denominator;
    }

    Rational operator+(const Rational& other) const {
        int n = nominator * other.denominator + other.nominator * denominator;
        unsigned int d = denominator * other.denominator;
        return Rational(n, d);
    }

    Rational operator-(const Rational& other) const {
        int n = nominator * other.denominator - other.nominator * denominator;
        unsigned int d = denominator * other.denominator;
        return Rational(n, d);
    }

    Rational operator*(const Rational& other) const {
        return Rational(nominator * other.nominator, denominator * other.denominator);
    }

    bool operator<(const Rational& other) const {
        return nominator * other.denominator < other.nominator * denominator;
    }

    double toDouble() const {
        return static_cast<double>(nominator) / denominator;
    }
};

class Point {
private:
    double x, y;
    static int count;

public:
    Point() : x(0), y(0) { count++; }
    Point(double x, double y) : x(x), y(y) { count++; }
    Point(const Point& other) : x(other.x), y(other.y) { count++; }
    
    ~Point() { count--; }

    static int counter() {
        return count;
    }

    double distance(const Point& other) const {
        return std::sqrt(std::pow(x - other.x, 2) + std::pow(y - other.y, 2));
    }

    void input() {
        std::cin >> x >> y;
    }
};

int Point::count = 0;

class Polynomial {
private:
    int N;
    double* coeffs;

public:
    Polynomial(int n) : N(n) {
        coeffs = new double[N];
        for (int i = 0; i < N; ++i) {
            coeffs[i] = 0.0;
        }
    }

    Polynomial(int n, double* initialCoeffs) : N(n) {
        coeffs = new double[N];
        for (int i = 0; i < N; ++i) {
            coeffs[i] = initialCoeffs[i];
        }
    }

    Polynomial(const Polynomial& other) : N(other.N) {
        coeffs = new double[N];
        for (int i = 0; i < N; ++i) {
            coeffs[i] = other.coeffs[i];
        }
    }

    ~Polynomial() {
        delete[] coeffs;
    }

    Polynomial& operator=(const Polynomial& other) {
        if (this != &other) {
            delete[] coeffs;
            N = other.N;
            coeffs = new double[N];
            for (int i = 0; i < N; ++i) {
                coeffs[i] = other.coeffs[i];
            }
        }
        return *this;
    }

    void fill() {
        for (int i = 0; i < N; ++i) {
            std::cin >> coeffs[i];
        }
    }

    void setCoeff(int index, double value) {
        if (index >= 0 && index < N) {
            coeffs[index] = value;
        }
    }

    void print() const {
        for (int i = 0; i < N; ++i) {
            std::cout << coeffs[i] << (i < N - 1 ? "x^" + std::to_string(i) + " + " : "x^" + std::to_string(i));
        }
        std::cout << std::endl;
    }

    friend void writeToBinary(const Polynomial& p, const std::string& filename);
    friend void readFromBinary(Polynomial& p, const std::string& filename);
};

void writeToBinary(const Polynomial& p, const std::string& filename) {
    std::ofstream out(filename, std::ios::binary);
    if (out) {
        out.write(reinterpret_cast<const char*>(&p.N), sizeof(p.N));
        out.write(reinterpret_cast<const char*>(p.coeffs), p.N * sizeof(double));
        out.close();
    }
}

void readFromBinary(Polynomial& p, const std::string& filename) {
    std::ifstream in(filename, std::ios::binary);
    if (in) {
        int newN;
        in.read(reinterpret_cast<char*>(&newN), sizeof(newN));
        if (newN != p.N) {
            delete[] p.coeffs;
            p.N = newN;
            p.coeffs = new double[p.N];
        }
        in.read(reinterpret_cast<char*>(p.coeffs), p.N * sizeof(double));
        in.close();
    }
}

void task1() {
    int n;
    std::cout << "Enter number of rational elements in array: ";
    std::cin >> n;

    std::vector<Rational> arr(n);
    for (int i = 0; i < n; ++i) {
        std::cout << "Enter nominator and denominator for element " << i + 1 << ": ";
        arr[i].input();
    }

    if (!arr.empty()) {
        Rational minRat = arr[0];
        for (int i = 1; i < n; ++i) {
            if (arr[i] < minRat) {
                minRat = arr[i];
            }
        }
        std::cout << "Smallest rational number is: ";
        minRat.print();
        std::cout << std::endl;
    }

    Rational sum(0, 1);
    int k = 1;
    double termValue = 1.0;

    while (std::abs(termValue) >= 0.01) {
        int sign = (k % 2 == 1) ? 1 : -1;
        Rational term(sign, k * k);
        sum = sum + term;
        termValue = term.toDouble();
        k++;
    }

    double expected = (M_PI * M_PI) / 12.0;

    std::cout << "Calculated sum of series: " << sum.toDouble() << std::endl;
    std::cout << "Expected pi^2 / 12: " << expected << std::endl;
}

void task2() {
    std::vector<Point> polygon;
    std::string answer;

    while (true) {
        std::cout << "Enter vertex? (Yes/No): ";
        std::cin >> answer;
        if (answer == "No" || answer == "no") {
            break;
        }
        
        Point p;
        std::cout << "Enter X and Y: ";
        p.input();
        polygon.push_back(p);
    }

    std::cout << "Number of vertices: " << Point::counter() << std::endl;

    double perimeter = 0.0;
    int n = polygon.size();

    if (n > 1) {
        for (int i = 0; i < n; ++i) {
            perimeter += polygon[i].distance(polygon[(i + 1) % n]);
        }
    }

    std::cout << "Perimeter of the polygon: " << perimeter << std::endl;
}

void task3() {
    std::cout << "Note: It is strictly desirable to overload the assignment operator (=) to prevent shallow copies." << std::endl;

    int n;
    std::cout << "Enter polynomial size: ";
    std::cin >> n;

    Polynomial p1(n);
    std::cout << "Enter " << n << " coefficients: ";
    p1.fill();

    std::cout << "Polynomial p1: ";
    p1.print();

    std::string filename = "poly.bin";
    writeToBinary(p1, filename);

    Polynomial p2(1); 
    readFromBinary(p2, filename);
    
    std::cout << "Polynomial p2 (read from binary file): ";
    p2.print();
}

int main() {
    task3();

    return 0;
}