#include <stdio.h>
#include <math.h>
int main(){
    double a,t,v;
    double distance, time_needed;
    printf("Enter the acceleration(a):");
    scanf("%lf",&a);
    printf("Enter the time(t):");
    scanf("%lf",&t);
    printf("Enter the target velocity(v):");
    scanf("%lf",&v);
    distance = 0.5*a*t*t;
    time_needed = v/a;
    printf("Distance traveled: %.2lf\n", distance);
    printf("Time needed to reach the target velocity: %.2lf\n", time_needed);
    return 0;

}