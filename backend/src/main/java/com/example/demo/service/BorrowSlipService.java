package com.example.demo.service;

import com.example.demo.dto.response.BorrowSlipResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.BorrowSlipMapper;
import com.example.demo.model.entity.BorrowSlip;
import com.example.demo.model.entity.User;
import com.example.demo.repository.BorrowSlipRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BorrowSlipService {

    private final BorrowSlipRepository borrowSlipRepository;
    private final UserRepository userRepository;
    private final BorrowSlipMapper borrowSlipMapper;

    @Transactional(readOnly = true)
    public PageResponse<BorrowSlipResponse> getMySlips(String username, Pageable pageable) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));
        return mapPage(borrowSlipRepository.findByUserId(user.getId(), pageable));
    }

    @Transactional(readOnly = true)
    public PageResponse<BorrowSlipResponse> getAllSlips(Pageable pageable) {
        return mapPage(borrowSlipRepository.findAll(pageable));
    }

    @Transactional(readOnly = true)
    public BorrowSlipResponse getSlipById(Long id) {
        BorrowSlip slip = borrowSlipRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("BorrowSlip", "id", id));
        return borrowSlipMapper.toResponse(slip);
    }

    private PageResponse<BorrowSlipResponse> mapPage(Page<BorrowSlip> page) {
        List<BorrowSlipResponse> content = page.getContent().stream()
                .map(borrowSlipMapper::toResponse)
                .toList();
        return PageResponse.from(page, content);
    }
}
