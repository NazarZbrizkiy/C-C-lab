#include <iostream>
#include <string>
#include <vector>
#include <random>
#include <set>
#include <algorithm>

using namespace std;

enum class Weather { RAINY, SNOWY, CLOUDY, CLEAR };

string weatherToString(Weather w) {
    switch(w) {
        case Weather::RAINY: return "RAINY";
        case Weather::SNOWY: return "SNOWY";
        case Weather::CLOUDY: return "CLOUDY";
        case Weather::CLEAR: return "CLEAR";
    }
    return "UNKNOWN";
}

class Town {
public:
    string name;
    int population;
    int altitude;
    Weather weather;

    Town(string n, int p, int a, Weather w) : name(n), population(p), altitude(a), weather(w) {}

    bool operator==(const Town& other) const {
        return name == other.name && population == other.population &&
               altitude == other.altitude && weather == other.weather;
    }

    bool operator!=(const Town& other) const {
        return !(*this == other);
    }

    friend ostream& operator<<(ostream& os, const Town& t) {
        os << "Town: " << t.name << " | Pop: " << t.population
           << " | Alt: " << t.altitude << " ft | Weather: " << weatherToString(t.weather);
        return os;
    }
};

class TownGenerator {
    set<string> usedNames;
    mt19937 rng;

    string generateUniqueName() {
        uniform_int_distribution<int> lengthDist(4, 9);
        uniform_int_distribution<int> charDist(0, 25);
        string name;
        do {
            name = "";
            int len = lengthDist(rng);
            for (int i = 0; i < len; ++i) {
                name += static_cast<char>('a' + charDist(rng));
            }
        } while (usedNames.count(name) > 0);
        
        usedNames.insert(name);
        return name;
    }

public:
    TownGenerator() {
        random_device rd;
        rng.seed(rd());
    }

    Town generate() {
        uniform_int_distribution<int> popDist(100, 999999);
        uniform_int_distribution<int> altDist(0, 7999);
        uniform_int_distribution<int> weatherDist(0, 3);

        string name = generateUniqueName();
        int pop = popDist(rng);
        int alt = altDist(rng);
        Weather w = static_cast<Weather>(weatherDist(rng));

        return Town(name, pop, alt, w);
    }
};

int main() {
    TownGenerator generator;
    vector<Town> towns;
    int numTowns = 30;

    for (int i = 0; i < numTowns; ++i) {
        towns.push_back(generator.generate());
    }

    cout << "--- All Generated Towns ---\n";
    for (const auto& t : towns) {
        cout << t << "\n";
    }

    cout << "\n--- Towns with altitude between 2500 and 3500 feet ---\n";
    bool found = false;
    for (const auto& t : towns) {
        if (t.altitude >= 2500 && t.altitude <= 3500) {
            cout << t << "\n";
            found = true;
        }
    }
    
    if (!found) {
        cout << "No towns found in this altitude range.\n";
    }

    return 0;
}