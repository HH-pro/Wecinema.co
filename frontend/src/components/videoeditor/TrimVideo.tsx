import { FaCut } from "react-icons/fa";

interface TrimVideoProps {
  onTrim: () => void;
}

const TrimVideo: React.FC<TrimVideoProps> = ({ onTrim }) => (
  <button
    onClick={onTrim}
    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "50px", height: "50px", borderRadius: "50%", background: "#444", border: "none", cursor: "pointer", transition: "background 0.3s" }}
    onMouseEnter={(e) => (e.currentTarget.style.background = "#ffb300")}
    onMouseLeave={(e) => (e.currentTarget.style.background = "#444")}
  >
    <FaCut size={20} />
  </button>
);

export default TrimVideo;
