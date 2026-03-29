#include <stdio.h>
#include <math.h>

void task9_v() {
    int n;
    double v0 = 0.0, v1 = 0.0, v2 = 1.5, vi;
    
    printf("Enter n: ");
    scanf("%d", &n);
    
    if (n < 0) {
        printf("Invalid index\n");
        return;
    }
    
    for (int i = 3; i <= n; i++) {
        vi = ((i - 2.0) / ((i - 3.0) * (i - 3.0) + 1.0)) * v2 - v1 * v0 + 1.0;
        v0 = v1;
        v1 = v2;
        v2 = vi;
    }
    
    if (n < 2) printf("v%d = 0.00\n", n);
    else printf("v%d = %.6lf\n", n, v2);
}
int main() {
    task9_v();
    return 0;
}