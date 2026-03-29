#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <string.h>

typedef struct {
    int day;
    int month;
    int year;
} Date;

typedef struct {
    char col;
    int row;
} ChessSquare;

typedef struct {
    double x;
    double y;
} Point;

typedef struct {
    Point p1;
    Point p2;
} Rectangle;

typedef struct {
    int degree;
    double *coeffs;
} Polynomial;

typedef struct {
    int numerator;
    unsigned int denominator;
} Rational;

typedef struct {
    char name[100];
    double height;
} Mountain;

void inputDate(Date *d) {
    scanf("%d %d %d", &d->day, &d->month, &d->year);
}

void printDate(Date d) {
    printf("%02d/%02d/%04d\n", d.day, d.month, d.year);
}

void inputChessSquare(ChessSquare *s) {
    scanf(" %c%d", &s->col, &s->row);
}

void printChessSquare(ChessSquare s) {
    printf("%c%d\n", s.col, s.row);
}

void inputRectangle(Rectangle *r) {
    scanf("%lf %lf %lf %lf", &r->p1.x, &r->p1.y, &r->p2.x, &r->p2.y);
}

void printRectangle(Rectangle r) {
    printf("[(%.2f, %.2f), (%.2f, %.2f)]\n", r.p1.x, r.p1.y, r.p2.x, r.p2.y);
}

void inputRational(Rational *r) {
    scanf("%d %u", &r->numerator, &r->denominator);
}

void printPolynomial(Polynomial p) {
    for (int i = 0; i <= p.degree; i++) {
        printf("%.2fx^%d ", p.coeffs[i], i);
        if (i < p.degree) printf("+ ");
    }
    printf("\n");
}

void inputMountain(Mountain *m) {
    scanf("%99s %lf", m->name, &m->height);
}

void printMountain(Mountain m) {
    printf("%s: %.2f\n", m.name, m.height);
}

void task1() {
    printf("--- Task 1 ---\n");
    
    Date d;
    printf("Enter date (dd mm yyyy): ");
    inputDate(&d);
    printDate(d);

    ChessSquare s;
    printf("Enter chess square (e.g. e4): ");
    inputChessSquare(&s);
    printChessSquare(s);

    Rectangle r;
    printf("Enter rectangle coordinates (x1 y1 x2 y2): ");
    inputRectangle(&r);
    printRectangle(r);

    Polynomial p;
    printf("Enter polynomial degree: ");
    scanf("%d", &p.degree);
    p.coeffs = (double *)malloc((p.degree + 1) * sizeof(double));
    printf("Enter %d coefficients: ", p.degree + 1);
    for (int i = 0; i <= p.degree; i++) {
        scanf("%lf", &p.coeffs[i]);
    }
    printPolynomial(p);
    free(p.coeffs);
    printf("\n");
}

bool checkQueen(ChessSquare start, ChessSquare end) {
    int dCol = abs(start.col - end.col);
    int dRow = abs(start.row - end.row);
    return (dCol == 0) || (dRow == 0) || (dCol == dRow);
}

void task2() {
    printf("--- Task 2 ---\n");
    ChessSquare s1, s2;
    printf("Enter start chess square: ");
    inputChessSquare(&s1);
    printf("Enter end chess square: ");
    inputChessSquare(&s2);
    
    printf("Can queen move? %s\n", checkQueen(s1, s2) ? "Yes" : "No");
    printf("\n");
}

int isLeap(int year) {
    return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
}

int daysInMonth(int month, int year) {
    if (month == 2) return isLeap(year) ? 29 : 28;
    if (month == 4 || month == 6 || month == 9 || month == 11) return 30;
    return 31;
}

Date getTomorrow(Date d) {
    d.day++;
    if (d.day > daysInMonth(d.month, d.year)) {
        d.day = 1;
        d.month++;
        if (d.month > 12) {
            d.month = 1;
            d.year++;
        }
    }
    return d;
}

void printDayOfWeek(Date d) {
    int q = d.day;
    int m = d.month;
    int y = d.year;
    if (m == 1 || m == 2) {
        m += 12;
        y--;
    }
    int k = y % 100;
    int j = y / 100;
    int h = (q + 13 * (m + 1) / 5 + k + k / 4 + j / 4 + 5 * j) % 7;

    const char* days[] = {"Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"};
    printf("Day of week: %s\n", days[h]);
}

void task3() {
    printf("--- Task 3 ---\n");
    Date today;
    printf("Enter today's date (dd mm yyyy): ");
    inputDate(&today);

    Date tomorrow = getTomorrow(today);
    printf("Tomorrow is: ");
    printDate(tomorrow);

    printDayOfWeek(today);
    printf("\n");
}

int gcd(int a, int b) {
    a = abs(a);
    b = abs(b);
    while (b != 0) {
        int temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

void reduceRational(Rational *r) {
    if (r->numerator == 0) {
        r->denominator = 1;
        return;
    }
    int g = gcd(r->numerator, r->denominator);
    r->numerator /= g;
    r->denominator /= g;
}

Rational addRational(Rational r1, Rational r2) {
    Rational res;
    res.numerator = r1.numerator * r2.denominator + r2.numerator * r1.denominator;
    res.denominator = r1.denominator * r2.denominator;
    reduceRational(&res);
    return res;
}

Rational multRational(Rational r1, Rational r2) {
    Rational res;
    res.numerator = r1.numerator * r2.numerator;
    res.denominator = r1.denominator * r2.denominator;
    reduceRational(&res);
    return res;
}

int compRational(Rational r1, Rational r2) {
    long long left = (long long)r1.numerator * r2.denominator;
    long long right = (long long)r2.numerator * r1.denominator;
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
}

void printRational(Rational r) {
    printf("%d/%u\n", r.numerator, r.denominator);
}

void task4() {
    printf("--- Task 4 ---\n");
    Rational r1, r2, r3;
    
    printf("Enter first rational number (numerator denominator): ");
    inputRational(&r1);
    
    printf("Enter second rational number (numerator denominator): ");
    inputRational(&r2);

    Rational sum = addRational(r1, r2);
    printf("Sum: ");
    printRational(sum);

    Rational prod = multRational(r1, r2);
    printf("Product: ");
    printRational(prod);

    int cmp = compRational(r1, r2);
    printf("Comparison result (-1 if <, 1 if >, 0 if ==): %d\n", cmp);

    printf("Enter a rational number to reduce (numerator denominator): ");
    inputRational(&r3);
    reduceRational(&r3);
    printf("Reduced form: ");
    printRational(r3);
    printf("\n");
}

void findHighestPeak(Mountain *arr, int n) {
    if (n <= 0) return;
    int maxIndex = 0;
    for (int i = 1; i < n; i++) {
        if (arr[i].height > arr[maxIndex].height) {
            maxIndex = i;
        }
    }
    printf("Highest peak is: %s\n", arr[maxIndex].name);
}

void findHeightByName(Mountain *arr, int n, char *searchName) {
    for (int i = 0; i < n; i++) {
        if (strcmp(arr[i].name, searchName) == 0) {
            printf("Height of %s: %.2f\n", searchName, arr[i].height);
            return;
        }
    }
    printf("Mountain %s not found in the array.\n", searchName);
}

void task5() {
    printf("--- Task 5 ---\n");
    int n;
    printf("Enter number of mountains: ");
    scanf("%d", &n);

    if (n <= 0) {
        printf("Invalid number of mountains.\n");
        return;
    }

    Mountain *mountains = (Mountain *)malloc(n * sizeof(Mountain));

    for (int i = 0; i < n; i++) {
        printf("Enter name and height for mountain %d (e.g. Hoverla 2061): ", i + 1);
        inputMountain(&mountains[i]);
    }

    printf("\n--- Mountains List ---\n");
    for (int i = 0; i < n; i++) {
        printMountain(mountains[i]);
    }

    printf("\n");
    findHighestPeak(mountains, n);

    char searchName[100];
    printf("\nEnter mountain name to find its height: ");
    scanf("%99s", searchName);
    
    findHeightByName(mountains, n, searchName);

    free(mountains);
    printf("\n");
}

int main() {
    task5();
    return 0;
}