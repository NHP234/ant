package com.example.demo.mapper;

import com.example.demo.dto.response.BorrowSlipResponse;
import com.example.demo.model.entity.BorrowSlip;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {BorrowRecordMapper.class})
public interface BorrowSlipMapper {

    @Mapping(source = "user.id", target = "userId")
    @Mapping(source = "user.fullName", target = "userFullName")
    @Mapping(target = "librarianName", expression = "java(slip.getLibrarian() != null ? slip.getLibrarian().getFullName() : null)")
    @Mapping(target = "source", expression = "java(slip.getSource().name())")
    BorrowSlipResponse toResponse(BorrowSlip slip);
}
