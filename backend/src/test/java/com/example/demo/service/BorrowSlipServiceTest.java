package com.example.demo.service;

import com.example.demo.dto.response.BorrowSlipResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.BorrowSlipMapper;
import com.example.demo.model.entity.BorrowSlip;
import com.example.demo.model.entity.User;
import com.example.demo.repository.BorrowSlipRepository;
import com.example.demo.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BorrowSlipServiceTest {

    @Mock private BorrowSlipRepository borrowSlipRepository;
    @Mock private UserRepository userRepository;
    @Mock private BorrowSlipMapper borrowSlipMapper;

    @InjectMocks private BorrowSlipService borrowSlipService;

    @Test
    void getMySlips_returnsMappedPage() {
        var pageable = PageRequest.of(0, 20);
        var user = User.builder().id(7L).username("student01").build();
        var slip = BorrowSlip.builder().id(11L).user(user).build();
        var response = BorrowSlipResponse.builder().id(11L).userId(7L).build();
        var page = new PageImpl<>(List.of(slip), pageable, 1);

        when(userRepository.findByUsername("student01")).thenReturn(Optional.of(user));
        when(borrowSlipRepository.findByUserId(7L, pageable)).thenReturn(page);
        when(borrowSlipMapper.toResponse(slip)).thenReturn(response);

        PageResponse<BorrowSlipResponse> result =
                borrowSlipService.getMySlips("student01", pageable);

        assertThat(result.getContent()).containsExactly(response);
        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    void getMySlips_throwsWhenUserDoesNotExist() {
        var pageable = PageRequest.of(0, 20);
        when(userRepository.findByUsername("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> borrowSlipService.getMySlips("missing", pageable))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getSlipById_returnsMappedResponse() {
        var slip = BorrowSlip.builder().id(11L).build();
        var response = BorrowSlipResponse.builder().id(11L).build();

        when(borrowSlipRepository.findById(11L)).thenReturn(Optional.of(slip));
        when(borrowSlipMapper.toResponse(slip)).thenReturn(response);

        assertThat(borrowSlipService.getSlipById(11L)).isSameAs(response);
    }
}
