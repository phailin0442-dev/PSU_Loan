import { createContext, useContext, useMemo, useState } from "react";
import { mockStudents } from "../data/mockData";

const AppContext = createContext(null);

export function AppProvider({ children }) {
    const [students, setStudents] = useState(mockStudents);
    const [selectedStudentId, setSelectedStudentId] = useState(mockStudents[0].id);
    const [role, setRole] = useState("student");

    const selectedStudent = useMemo(
        () => students.find((student) => student.id === selectedStudentId) || students[0],
        [students, selectedStudentId]
    );

    const updateSelectedStudent = (updatedStudent) => {
        setStudents((current) =>
            current.map((student) =>
                student.id === updatedStudent.id ? updatedStudent : student
            )
        );
    };

    return (
        <AppContext.Provider
            value={{
                students,
                setStudents,
                selectedStudent,
                selectedStudentId,
                setSelectedStudentId,
                updateSelectedStudent,
                role,
                setRole,
            }}
        >
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);

    if (!context) {
        throw new Error("useApp ต้องใช้อยู่ภายใน AppProvider");
    }

    return context;
}
