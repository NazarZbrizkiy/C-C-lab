#include <stdio.h>
#include <math.h>
int main(){
    double x1, y1, r1;
    printf("Enter the center of the circle (x, y): ");
    scanf("%lf %lf", &x1, &y1);
    printf("Enter the radius of the circle: ");
    scanf("%lf", &r1);
    double x2, y2, r2;
    printf("Enter the center of the second circle (x, y): ");
    scanf("%lf %lf", &x2, &y2);
    printf("Enter the radius of the second circle: ");
    scanf("%lf", &r2);
    double distance = sqrt(pow(x2 - x1, 2) + pow(y2 - y1, 2));
    if (distance > r1 + r2) {
        printf("The circles do not intersect.\n");
    } else if (distance < fabs(r1 - r2)) {
        printf("One circle is inside the other.\n");
    } else if (distance == 0 && r1 == r2) {
        printf("The circles are coincident.\n");
    } else if (distance == r1 + r2 || distance == fabs(r1 - r2)) {
        printf("The circles touch at one point.\n");
    } else {
        printf("The circles intersect at two points.\n");
    }
    
}