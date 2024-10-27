import Slider from "@mui/material/Slider";
import { alpha, styled } from "@mui/material/styles";

const SuccessSlider = styled(Slider)(() => ({
    color: "#57bde6",
    "& .MuiSlider-thumb": {
        "&:hover, &.Mui-focusVisible": {
            boxShadow: `0px 0px 0px 8px ${alpha("#57bde6", 0.16)}`,
        },
        "&.Mui-active": {
            boxShadow: `0px 0px 0px 14px ${alpha("#57bde6", 0.16)}`,
        },
    },
    "& .MuiSlider-rail": {
        color: "#A8AFB3",
        opacity: 1
    },
}));

export default function StyledCustomization({ disabled, value, min, max, step, onInput, onChange, onChangeCommited, defaultValue, marks, style }) {
    return <SuccessSlider disabled={disabled} value={value} min={min} max={max} step={step} onInput={onInput} onChangeCommitted={onChangeCommited} onChange={onChange} defaultValue={defaultValue} marks={marks} style={style} />;
}