#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <math.h>
#include <string.h>

typedef struct {
    int day;
    int month;
    int year;
} Date;

Date inputDate() {
    Date d;
    printf("Enter date (DD MM YYYY): ");
    scanf("%d %d %d", &d.day, &d.month, &d.year);
    return d;
}

void printDate(Date d) {
    printf("Date: %02d/%02d/%04d\n", d.day, d.month, d.year);
}

typedef struct {
    char file;
    int rank;
} ChessSquare;

ChessSquare inputChessSquare() {
    ChessSquare s;
    printf("Enter chess square (e.g., a5): ");
    scanf(" %c%d", &s.file, &s.rank);
    return s;
}

void printChessSquare(ChessSquare s) {
    printf("Chess square: %c%d\n", s.file, s.rank);
}

typedef struct {
    double x;
    double y;
} Point;

typedef struct {
    Point p1;
    Point p2;
} Rectangle;

Rectangle inputRectangle() {
    Rectangle r;
    printf("Enter x and y for vertex 1: ");
    scanf("%lf %lf", &r.p1.x, &r.p1.y);
    printf("Enter x and y for vertex 2: ");
    scanf("%lf %lf", &r.p2.x, &r.p2.y);
    return r;
}

void printRectangle(Rectangle r) {
    printf("Rectangle vertices: (%.2lf, %.2lf) and (%.2lf, %.2lf)\n", r.p1.x, r.p1.y, r.p2.x, r.p2.y);
}

typedef struct {
    int degree;
    double *coeffs;
} Polynomial;

Polynomial inputPolynomial() {
    Polynomial p;
    printf("Enter polynomial degree: ");
    scanf("%d", &p.degree);
    p.coeffs = (double *)malloc((p.degree + 1) * sizeof(double));
    printf("Enter %d coefficients: ", p.degree + 1);
    for (int i = 0; i <= p.degree; i++) {
        scanf("%lf", &p.coeffs[i]);
    }
    return p;
}

void printPolynomial(Polynomial p) {
    printf("Polynomial: ");
    for (int i = p.degree; i >= 0; i--) {
        printf("%.2lf*x^%d ", p.coeffs[i], i);
        if (i > 0) printf("+ ");
    }
    printf("\n");
}

void freePolynomial(Polynomial *p) {
    free(p->coeffs);
}

typedef struct {
    int numerator;
    unsigned int denominator;
} Rational;

typedef struct {
    char name[100];
    double height;
} Mountain;

bool canQueenMove(ChessSquare start, ChessSquare end) {
    int fileDiff = abs(start.file - end.file);
    int rankDiff = abs(start.rank - end.rank);
    return (start.file == end.file) || (start.rank == end.rank) || (fileDiff == rankDiff);
}

bool isLeapYear(int year) {
    return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
}

int daysInMonth(int month, int year) {
    int days[] = { 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 };
    if (month == 2 && isLeapYear(year)) return 29;
    return days[month - 1];
}

Date getTomorrow(Date d) {
    Date tomorrow = d;
    tomorrow.day++;
    if (tomorrow.day > daysInMonth(d.month, d.year)) {
        tomorrow.day = 1;
        tomorrow.month++;
        if (tomorrow.month > 12) {
            tomorrow.month = 1;
            tomorrow.year++;
        }
    }
    return tomorrow;
}

int getDayOfWeek(Date d) {
    int t[] = { 0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4 };
    int y = d.year - (d.month < 3);
    return (y + y / 4 - y / 100 + y / 400 + t[d.month - 1] + d.day) % 7;
}

void printDayOfWeek(int day) {
    const char *days[] = { "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" };
    printf("Day of the week: %s\n", days[day]);
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

Rational simplifyRational(Rational r) {
    int commonDivisor = gcd(r.numerator, r.denominator);
    r.numerator /= commonDivisor;
    r.denominator /= commonDivisor;
    return r;
}

Rational addRational(Rational r1, Rational r2) {
    Rational result;
    result.numerator = r1.numerator * r2.denominator + r2.numerator * r1.denominator;
    result.denominator = r1.denominator * r2.denominator;
    return simplifyRational(result);
}

Rational multiplyRational(Rational r1, Rational r2) {
    Rational result;
    result.numerator = r1.numerator * r2.numerator;
    result.denominator = r1.denominator * r2.denominator;
    return simplifyRational(result);
}

int compareRational(Rational r1, Rational r2) {
    int left = r1.numerator * r2.denominator;
    int right = r2.numerator * r1.denominator;
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
}

Rational inputRational() {
    Rational r;
    printf("Enter numerator and denominator: ");
    scanf("%d %u", &r.numerator, &r.denominator);
    if (r.denominator == 0) {
        printf("Denominator cannot be zero. Setting to 1.\n");
        r.denominator = 1;
    }
    return simplifyRational(r);
}

void printRational(Rational r) {
    printf("%d/%u\n", r.numerator, r.denominator);
}

void task1() {
    Date d = inputDate();
    printDate(d);

    ChessSquare cs = inputChessSquare();
    printChessSquare(cs);

    Rectangle r = inputRectangle();
    printRectangle(r);

    Polynomial p = inputPolynomial();
    printPolynomial(p);
    freePolynomial(&p);
}

void task2() {
    ChessSquare start, end;
    printf("Start square:\n");
    start = inputChessSquare();
    printf("Target square:\n");
    end = inputChessSquare();

    if (canQueenMove(start, end)) {
        printf("The Queen CAN move there in one turn.\n");
    } else {
        printf("The Queen CANNOT move there in one turn.\n");
    }
}

void task3() {
    Date d = inputDate();
    printDate(d);

    Date tomorrow = getTomorrow(d);
    printf("Tomorrow's ");
    printDate(tomorrow);

    int dayOfWeek = getDayOfWeek(d);
    printDayOfWeek(dayOfWeek);
}

void task4() {
    printf("First rational number:\n");
    Rational r1 = inputRational();
    printf("Second rational number:\n");
    Rational r2 = inputRational();

    printf("Reduced R1: ");
    printRational(r1);
    printf("Reduced R2: ");
    printRational(r2);

    Rational sum = addRational(r1, r2);
    printf("Sum: ");
    printRational(sum);

    Rational prod = multiplyRational(r1, r2);
    printf("Product: ");
    printRational(prod);

    int cmp = compareRational(r1, r2);
    if (cmp > 0) printf("R1 is greater than R2.\n");
    else if (cmp < 0) printf("R1 is less than R2.\n");
    else printf("R1 is equal to R2.\n");
}

void task5() {
    int N;
    printf("Enter number of mountains: ");
    scanf("%d", &N);

    Mountain *mountains = (Mountain *)malloc(N * sizeof(Mountain));
    if (!mountains) return;

    for (int i = 0; i < N; i++) {
        printf("Enter name of mountain %d: ", i + 1);
        scanf(" %[^\n]", mountains[i].name);
        printf("Enter height of %s: ", mountains[i].name);
        scanf("%lf", &mountains[i].height);
    }

    if (N > 0) {
        int highestIdx = 0;
        for (int i = 1; i < N; i++) {
            if (mountains[i].height > mountains[highestIdx].height) {
                highestIdx = i;
            }
        }
        printf("\nThe highest mountain is: %s\n", mountains[highestIdx].name);
    }

    char searchName[100];
    printf("\nEnter mountain name to search: ");
    scanf(" %[^\n]", searchName);

    bool found = false;
    for (int i = 0; i < N; i++) {
        if (strcmp(mountains[i].name, searchName) == 0) {
            printf("Height of %s is %.2lf\n", mountains[i].name, mountains[i].height);
            found = true;
            break;
        }
    }

    if (!found) {
        printf("Mountain not found.\n");
    }

    free(mountains);
}

int main() {
    task1();
    
    return 0;
}