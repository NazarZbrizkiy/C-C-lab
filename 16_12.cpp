#include <iostream>
#include <vector>
#include <cmath>
#include <limits>
#include <iomanip>

using namespace std;

class Equation {
protected:
    double intervalStart;
    double intervalEnd;
    bool hasSolution;
    double root;

public:
    Equation(double start, double end) : intervalStart(start), intervalEnd(end), hasSolution(false), root(0) {}
    virtual ~Equation() {}

    virtual double f(double x) const = 0;
    virtual void print() const = 0;

    virtual void findRoot() {
        double step = (intervalEnd - intervalStart) / 1000.0;
        for (double a = intervalStart; a < intervalEnd; a += step) {
            double b = a + step;
            if (f(a) * f(b) <= 0) {
                double left = a, right = b;
                while ((right - left) > 1e-6) {
                    double mid = left + (right - left) / 2.0;
                    if (f(left) * f(mid) <= 0) {
                        right = mid;
                    } else {
                        left = mid;
                    }
                }
                root = left + (right - left) / 2.0;
                hasSolution = true;
                return;
            }
        }
        hasSolution = false;
    }

    bool getHasSolution() const { return hasSolution; }
    double getRoot() const { return root; }
};

class LinearEquation : public Equation {
    double a, b;
public:
    LinearEquation(double start, double end, double a, double b) : Equation(start, end), a(a), b(b) {}
    
    double f(double x) const override { 
        return a * x + b; 
    }
    
    void print() const override { 
        cout << "Linear: " << a << "x + " << b << " = 0\n"; 
    }
    
    void findRoot() override {
        if (a == 0) {
            hasSolution = false;
        } else {
            root = -b / a;
            hasSolution = (root >= intervalStart && root <= intervalEnd);
        }
    }
};

class CubicEquation : public Equation {
    double a, b, c, d;
public:
    CubicEquation(double start, double end, double a, double b, double c, double d) 
        : Equation(start, end), a(a), b(b), c(c), d(d) {}
        
    double f(double x) const override { 
        return a * x * x * x + b * x * x + c * x + d; 
    }
    
    void print() const override { 
        cout << "Cubic: " << a << "x^3 + " << b << "x^2 + " << c << "x + " << d << " = 0\n"; 
    }
};

class SineEquation : public Equation {
    double a, b, c;
public:
    SineEquation(double start, double end, double a, double b, double c) 
        : Equation(start, end), a(a), b(b), c(c) {}
        
    double f(double x) const override { 
        return a * sin(b * x) + c; 
    }
    
    void print() const override { 
        cout << "Sine: " << a << "sin(" << b << "x) + " << c << " = 0\n"; 
    }
};

class ExponentialEquation : public Equation {
    double a, b, c;
public:
    ExponentialEquation(double start, double end, double a, double b, double c)
        : Equation(start, end), a(a), b(b), c(c) {}
        
    double f(double x) const override { 
        return a * exp(b * x) + c; 
    }
    
    void print() const override { 
        cout << "Exponential: " << a << "e^(" << b << "x) + " << c << " = 0\n"; 
    }
};

int main() {
    vector<Equation*> equations;
    
    equations.push_back(new LinearEquation(-10, 10, 2, -4));
    equations.push_back(new CubicEquation(-10, 10, 1, -6, 11, -6));
    equations.push_back(new SineEquation(-10, 10, 1, 1, 0));
    equations.push_back(new ExponentialEquation(-10, 10, 1, 1, 10));
    equations.push_back(new LinearEquation(-10, 10, 0, 5)); 

    for (auto eq : equations) {
        eq->findRoot();
    }

    cout << "--- Equations with no real solutions in the given interval ---\n";
    bool allHaveSolutions = true;
    for (auto eq : equations) {
        if (!eq->getHasSolution()) {
            eq->print();
            allHaveSolutions = false;
        }
    }

    double maxRoot = -numeric_limits<double>::infinity();
    double minRoot = numeric_limits<double>::infinity();
    double sumRoots = 0;
    bool foundAny = false;

    for (auto eq : equations) {
        if (eq->getHasSolution()) {
            foundAny = true;
            double r = eq->getRoot();
            if (r > maxRoot) maxRoot = r;
            if (r < minRoot) minRoot = r;
            sumRoots += r;
        }
    }

    cout << "\n--- Analysis ---\n";
    if (foundAny) {
        cout << "Largest solution: " << maxRoot << "\n";
        cout << "Sum of all real solutions: " << sumRoots << "\n";
    } else {
        cout << "No real solutions found in any equation.\n";
    }

    if (allHaveSolutions && foundAny) {
        cout << "Interval containing at least one solution for all equations: [" 
             << minRoot << ", " << maxRoot << "]\n";
    } else {
        cout << "There is no interval where ALL equations have at least one real solution.\n";
    }

    for (auto eq : equations) {
        delete eq;
    }

    return 0;
}