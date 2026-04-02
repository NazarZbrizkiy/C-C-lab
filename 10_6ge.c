#include <stdio.h>

typedef struct {
    char city[100];
    char street[100];
    char house[20];
    int apartment;
} Address;

void inputAddress(Address *addr) {
    printf("Enter city: ");
    scanf(" %[^\n]", addr->city);
    
    printf("Enter street: ");
    scanf(" %[^\n]", addr->street);
    
    printf("Enter house number: ");
    scanf(" %[^\n]", addr->house);
    
    printf("Enter apartment number: ");
    scanf("%d", &addr->apartment);
}

void outputAddress(const Address *addr) {
    printf("Address: %s, %s st., bld. %s, apt. %d\n", 
           addr->city, addr->street, addr->house, addr->apartment);
}

int main() {
    Address addr;
    
    inputAddress(&addr);
    
    printf("\n--- Output ---\n");
    outputAddress(&addr);
    
    return 0;
}