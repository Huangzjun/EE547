import sys
from collections import Counter

def factorial(n):
    if n == 0 or n == 1:
        return 1
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result

def count_anagrams(input_str):
    if not input_str:
        print("empty")
        return
    if not input_str.isalpha():
        sys.stderr.write("invalid\n")
        return
    input_str = input_str.lower()
    char_count = Counter(input_str)
    total_length = len(input_str)
    numerator = factorial(total_length)
    denominator = 1
    for count in char_count.values():
        denominator *= factorial(count)
    result = numerator // denominator
    print(result)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.stderr.write("invalid\n")
    else:
        count_anagrams(sys.argv[1])
