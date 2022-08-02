// import { Box, MenuItem, SelectChangeEvent } from "@mui/material";
// import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
// import { MarkedSelect } from "../../../../components/MarkedSelect/MarkedSelect";
// import { RangePicker } from "../../../../components/RangePicker/RangePicker";
// import { useMonitorSelector, useTypedDispatch } from "../../../../hook/redux";
// import { useSelector } from "../../../../hook/useSelector";
// import { getMonitor, updateMonitor } from "../../../../store/requests/monitor";
// import { ID } from "../../../../types";
// import { Subcategory } from "../Subcategory/Subcategory";
// import {
//   StyledButton,
//   StyledButtonWrapper,
//   StyledStackContainer,
//   StyledStackInputs,
//   StyledTypography,
// } from "./EditMonitor.style";

// const timeWindow = [
//   { label: "1 hour", value: 60 * 60 },
//   { label: "1 day", value: 60 * 60 * 24 },
//   { label: "1 week", value: 60 * 60 * 24 * 7 },
//   { label: "1 month", value: 60 * 60 * 24 * 7 * 31 },
// ];

// interface EditMonitorProps {
//   monitorId: ID;
//   onClose: () => void | undefined;
// }

// export function EditMonitor({ monitorId, onClose }: EditMonitorProps) {
//   const { monitor } = useMonitorSelector();

//   const [time, setTime] = useState<string>("");
//   const [column, handleColumnChange, setColumn] = useSelector("");
//   const [category, handleCategoryChange, setCategory] = useSelector("");
//   const [numericValue, setNumericValue] = useState<number | "">(0);

//   const [ColumnComponent, setColumnComponent] = useState<ReactNode>(null);

//   const dispatch = useTypedDispatch();

//   const handleTimeChange = (event: SelectChangeEvent<unknown>) => {
//     setTime(event.target.value as string);
//   };

//   const handleSliderChange = (event: Event, newValue: number | number[]) => {
//     if (!Array.isArray(newValue)) {
//       setNumericValue(newValue);
//     }
//   };

//   const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     setNumericValue(event.target.value ? +event.target.value : "");
//   };

//   const handleInputBlur = () => {
//     if (numericValue < columns.a.values[0]) {
//       setNumericValue(columns.a.values[0]);
//     } else if (numericValue > columns.a.values[1]) {
//       setNumericValue(columns.a.values[1]);
//     }
//   };

//   useEffect(() => {
//     dispatch(getMonitor(monitorId));
//   }, [dispatch, monitorId]);

//   useEffect(() => {
//     if (monitor) {
//       setColumn(monitor.data_filter?.column || "");

//       if (typeof monitor.data_filter?.value === "number") {
//         setNumericValue(monitor.data_filter?.value);
//         return;
//       }

//       setCategory(monitor.data_filter?.value || "");
//     }
//   }, [monitor]);

//   const onSubmit = (event: FormEvent<HTMLFormElement>) => {
//     event.preventDefault();
//     dispatch(updateMonitor({}));
//     onClose();
//   };

//   useMemo(() => {
//     if (column === "b") {
//       setColumnComponent(
//         <Subcategory>
//           <MarkedSelect
//             label="Select category"
//             onChange={handleCategoryChange}
//             size="small"
//             value={category}
//             disabled={!columns.b.values.length}
//             fullWidth
//           >
//             {columns.b.values.map((col, index) => (
//               <MenuItem key={index} value={col}>
//                 {col}
//               </MenuItem>
//             ))}
//           </MarkedSelect>
//         </Subcategory>
//       );
//       return;
//     }

//     if (column === "a") {
//       setColumnComponent(
//         <Box mt="39px">
//           <RangePicker
//             onChange={handleSliderChange}
//             handleInputBlur={handleInputBlur}
//             handleInputChange={handleInputChange}
//             value={numericValue || 0}
//             min={columns.a.values[0]}
//             max={columns.a.values[1]}
//             valueLabelDisplay="auto"
//           />
//         </Box>
//       );
//       return;
//     }

//     setColumnComponent(null);
//   }, [column, category, numericValue]);

//   return (
//     <form onSubmit={onSubmit}>
//       <StyledStackContainer>
//         <Box>
//           <StyledTypography variant="h4">Edit Monitor</StyledTypography>
//           <StyledStackInputs spacing="60px">
//             <MarkedSelect
//               label="Time Window"
//               onChange={handleTimeChange}
//               size="small"
//               value={time}
//             >
//               {timeWindow.map(({ label, value }, index) => (
//                 <MenuItem key={index} value={value}>
//                   {label}
//                 </MenuItem>
//               ))}
//             </MarkedSelect>
//             <Box width={1}>
//               <MarkedSelect
//                 label="Filter by Column"
//                 onChange={handleColumnChange}
//                 size="small"
//                 value={column}
//                 disabled={!Object.keys(columns).length}
//                 fullWidth
//               >
//                 {Object.entries(columns).map(([key, col]) => (
//                   <MenuItem key={key} value={key}>
//                     {col.type}
//                   </MenuItem>
//                 ))}
//               </MarkedSelect>
//               {ColumnComponent}
//             </Box>
//           </StyledStackInputs>
//         </Box>

//         <StyledButtonWrapper>
//           <StyledButton type="submit" size="large" disabled={!time}>
//             Apply Changes
//           </StyledButton>
//         </StyledButtonWrapper>
//       </StyledStackContainer>
//     </form>
//   );
// }

export function EditMonitor() {
  return <div>Edit Monitor</div>;
}
