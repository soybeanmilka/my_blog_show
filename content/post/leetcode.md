---
date : '2026-06-04T02:00:21+08:00'
draft : true
title : 'Leetcode'
---

# 523. 连续的子数组和

## 题目理解

给定一个整数数组 `nums` 和一个整数 `k`，判断数组中是否存在一个长度至少为 `2` 的连续子数组，使得这个子数组的元素和是 `k` 的倍数。

也就是说，需要判断是否存在一段连续区间 `[l, r]`，满足：

```cpp
nums[l] + nums[l + 1] + ... + nums[r] = n * k
```

并且：

```cpp
r - l + 1 >= 2
```

其中 `n` 是整数。

---

## 核心思路：前缀和 + 哈希表

如果直接枚举所有子数组，需要两层循环，时间复杂度是 `O(n^2)`，效率比较低。

这道题可以使用 **前缀和 + 哈希表** 优化。

前缀和的含义是：

```cpp
preSum[i] = nums[0] + nums[1] + ... + nums[i - 1]
```

所以区间 `[j, i - 1]` 的和可以表示为：

```cpp
preSum[i] - preSum[j]
```

如果这个区间和是 `k` 的倍数，那么：

```cpp
(preSum[i] - preSum[j]) % k == 0
```

这个式子可以变形为：

```cpp
preSum[i] % k == preSum[j] % k
```

也就是说：

> 如果两个前缀和除以 `k` 的余数相同，那么它们之间的子数组和一定是 `k` 的倍数。

---

## 哈希表存什么？

使用一个哈希表：

```cpp
unordered_map<int, int> valToIndex;
```

它用来记录：

```cpp
前缀和 % k 的余数 -> 这个余数第一次出现的下标
```

例如：

```cpp
valToIndex[5] = 1;
```

表示：

```cpp
余数 5 第一次出现在前缀和数组下标 1 的位置
```

之所以只记录第一次出现的位置，是因为题目要求子数组长度至少为 `2`，保留更早的位置，可以让后面计算出的子数组长度更长。

---

## 判断条件

当遍历到当前位置 `i` 时，计算当前前缀和余数：

```cpp
int val = preSum[i] % k;
```

如果这个余数之前出现过，假设之前的位置是 `valToIndex[val]`，那么说明：

```cpp
preSum[i] % k == preSum[valToIndex[val]] % k
```

因此：

```cpp
preSum[i] - preSum[valToIndex[val]]
```

一定是 `k` 的倍数。

但是题目要求子数组长度至少为 `2`，所以还需要判断：

```cpp
i - valToIndex[val] >= 2
```

如果满足，就返回 `true`。

---

## 代码实现

```cpp
#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    bool checkSubarraySum(vector<int>& nums, int k) {
        int n = nums.size();

        // preSum 表示当前前缀和
        int preSum = 0;

        // 哈希表：余数 -> 第一次出现的位置
        unordered_map<int, int> valToIndex;

        // 前缀和为 0 的位置记为 -1
        // 这样可以处理从 nums[0] 开始的子数组
        valToIndex[0] = -1;

        for (int i = 0; i < n; i++) {
            preSum += nums[i];

            // 当前前缀和除以 k 的余数
            int val = preSum % k;

            // 如果这个余数之前出现过
            if (valToIndex.count(val)) {
                // 判断子数组长度是否至少为 2
                if (i - valToIndex[val] >= 2) {
                    return true;
                }
            } else {
                // 只记录第一次出现的位置
                valToIndex[val] = i;
            }
        }

        return false;
    }
};
```

---

## 为什么要初始化 `valToIndex[0] = -1`？

这是为了处理从数组开头开始的子数组。

例如：

```cpp
nums = [23, 2, 4, 6, 7]
k = 6
```

当遍历到某个位置时，如果前缀和本身就可以被 `k` 整除，那么它的余数就是 `0`。

如果没有提前放入：

```cpp
valToIndex[0] = -1;
```

就不好判断从 `nums[0]` 开始的子数组。

放入之后，相当于认为：

```cpp
在数组开始之前，前缀和为 0
```

这样逻辑就统一了。

---

## 示例分析

以：

```cpp
nums = [23, 2, 4, 6, 7]
k = 6
```

为例。

遍历过程如下：

| i    | nums[i] | preSum | preSum % k | 哈希表情况     |
| ---- | ------: | -----: | ---------: | -------------- |
| -1   |       - |      0 |          0 | 记录 `0 -> -1` |
| 0    |      23 |     23 |          5 | 记录 `5 -> 0`  |
| 1    |       2 |     25 |          1 | 记录 `1 -> 1`  |
| 2    |       4 |     29 |          5 | 余数 5 出现过  |

当 `i = 2` 时，当前余数是 `5`，之前余数 `5` 第一次出现在下标 `0`。

所以：

```cpp
i - valToIndex[5] = 2 - 0 = 2
```

长度满足至少为 `2`。

对应的子数组是：

```cpp
[2, 4]
```

它的和是：

```cpp
2 + 4 = 6
```

`6` 是 `k = 6` 的倍数，所以返回 `true`。

---

## 复杂度分析

时间复杂度：

```cpp
O(n)
```

只需要遍历数组一次。

空间复杂度：

```cpp
O(k)
```

哈希表中最多存储不同的余数，最多不会超过 `k` 个。

---

## 总结

这道题的关键不是直接找子数组，而是利用前缀和余数的性质。

核心规律是：

```cpp
如果 preSum[i] % k == preSum[j] % k
那么 preSum[i] - preSum[j] 一定可以被 k 整除
```

所以只需要用哈希表记录每种余数第一次出现的位置，然后判断两个位置之间的距离是否至少为 `2` 即可。