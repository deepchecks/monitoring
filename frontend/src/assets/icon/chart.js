export const ChartSvg = ({first, second, third}) => {
    return (
        <svg width="21" height="24" viewBox="0 0 21 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect y="12.5" width="5" height="11" rx="2.5" fill={first ? "rgb(255, 255, 255)" : "rgba(255, 255, 255, 0.2)"}/>
            <rect x="8" y="6.5" width="5" height="17" rx="2.5" fill={second ? "rgb(255, 255, 255)" : "rgba(255, 255, 255, 0.2)"}/>
            <rect x="16" y="0.5" width="5" height="23" rx="2.5" fill={third ? "rgb(255, 255, 255)" : "rgba(255, 255, 255, 0.2)"}/>
        </svg>
    )
}
