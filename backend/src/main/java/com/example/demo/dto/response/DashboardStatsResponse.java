package com.example.demo.dto.response;

import lombok.*;

import java.io.Serializable;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsResponse implements Serializable {

    private long totalBooks;
    private long totalUsers;
    private long activeBorrows;
    private long overdueBooks;
    private long totalCategories;
}
