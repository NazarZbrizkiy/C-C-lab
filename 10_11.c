#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    char street[100];
    char house[20];
    int apartment;
} Address;

typedef struct {
    char surname[100];
    char city[100];
    Address address;
} Resident;

void findMatchingAddress(Resident *residents, int n) {
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (strcmp(residents[i].city, residents[j].city) != 0 &&
                strcmp(residents[i].address.street, residents[j].address.street) == 0 &&
                strcmp(residents[i].address.house, residents[j].address.house) == 0 &&
                residents[i].address.apartment == residents[j].address.apartment) {
                
                printf("Found matching residents:\n");
                printf("1. %s (City: %s, Address: %s st., bld. %s, apt. %d)\n", 
                       residents[i].surname, residents[i].city, 
                       residents[i].address.street, residents[i].address.house, residents[i].address.apartment);
                printf("2. %s (City: %s, Address: %s st., bld. %s, apt. %d)\n", 
                       residents[j].surname, residents[j].city, 
                       residents[j].address.street, residents[j].address.house, residents[j].address.apartment);
                return;
            }
        }
    }
    printf("No such residents found.\n");
}

int main() {
    int n;
    
    printf("Enter the number of residents: ");
    if (scanf("%d", &n) != 1 || n <= 0) {
        printf("Invalid input.\n");
        return 1;
    }

    Resident *residents = (Resident *)malloc(n * sizeof(Resident));
    if (residents == NULL) {
        printf("Memory allocation failed.\n");
        return 1;
    }

    for (int i = 0; i < n; i++) {
        printf("\n--- Resident %d ---\n", i + 1);
        printf("Enter surname: ");
        scanf(" %[^\n]", residents[i].surname);
        
        printf("Enter city: ");
        scanf(" %[^\n]", residents[i].city);
        
        printf("Enter street: ");
        scanf(" %[^\n]", residents[i].address.street);
        
        printf("Enter house number: ");
        scanf(" %[^\n]", residents[i].address.house);
        
        printf("Enter apartment number: ");
        scanf("%d", &residents[i].address.apartment);
    }

    printf("\n--- Result ---\n");
    findMatchingAddress(residents, n);

    free(residents);

    return 0;
}