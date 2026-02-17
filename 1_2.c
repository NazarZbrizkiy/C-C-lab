#include <stdio.h>
#include <math.h>
int main() {
float f1 = 1e-4f;
    float f2 = 24.33e5f;
    float f3 = (float)M_PI;
    float f4 = (float)M_E;
    float f5 = sqrtf(5.0f);
    float f6 = logf(100.0f);
    
    double d1 = 1e-4;
    double d2 = 24.33e5;
    double d3 = M_PI;
    double d4 = M_E;
    double d5 = sqrt(5.0);
    double d6 = log(100.0);

    long double ld1 = 1e-4L;
    long double ld2 = 24.33e5L;
    long double ld3 = (long double)M_PI;
    long double ld4 = (long double)M_E;
    long double ld5 = sqrtl(5.0L);
    long double ld6 = logl(100.0L);
    printf("float: %e, %e, %e, %e, %e, %e\n", f1, f2, f3, f4, f5, f6);
    printf("double: %e, %e, %e, %e, %e, %e\n", d1, d2, d3, d4, d5, d6);
    printf("long double: %Le, %Le, %Le, %Le, %Le, %Le\n", ld1, ld2, ld3, ld4, ld5, ld6);
    return 0;
}