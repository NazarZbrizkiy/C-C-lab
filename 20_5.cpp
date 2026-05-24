#include <iostream>
#include <vector>
#include <map>

using namespace std;

struct Point {
    double x, y;
};

struct Segment {
    Point p1, p2;
};

bool getIntersection(Segment s1, Segment s2, Point& out_p) {
    double x1 = s1.p1.x, y1 = s1.p1.y;
    double x2 = s1.p2.x, y2 = s1.p2.y;
    double x3 = s2.p1.x, y3 = s2.p1.y;
    double x4 = s2.p2.x, y4 = s2.p2.y;

    double den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (den == 0) return false;

    double t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    double u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        out_p.x = x1 + t * (x2 - x1);
        out_p.y = y1 + t * (y2 - y1);
        return true;
    }
    return false;
}

int main() {
    int n;
    cout << "Enter number of segments: ";
    if (!(cin >> n) || n < 2) {
        cout << "Invalid input or not enough segments to intersect.\n";
        return 1;
    }

    vector<Segment> segments(n);
    cout << "Enter segments (x1 y1 x2 y2):\n";
    for (int i = 0; i < n; ++i) {
        cin >> segments[i].p1.x >> segments[i].p1.y 
            >> segments[i].p2.x >> segments[i].p2.y;
    }

    map<double, double> intersections;

    for (int i = 0; i < n; ++i) {
        for (int j = i + 1; j < n; ++j) {
            Point p;
            if (getIntersection(segments[i], segments[j], p)) {
                intersections[p.x] = p.y;
            }
        }
    }

    if (intersections.empty()) {
        cout << "No intersections found.\n";
    } else {
        auto it = intersections.begin();
        cout << "Intersection point with minimum abscissa: (" 
             << it->first << ", " << it->second << ")\n";
    }

    return 0;
}