import React from "react";

interface Parameter {
  name: string;
  type: "string" | "number" | "select";
  label: string;
  options?: string[];
  default?: string | number;
}

interface ParameterFormProps {
  parameters: Parameter[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
}

export const ParameterForm: React.FC<ParameterFormProps> = ({
  parameters,
  values,
  onChange,
}) => {
  return (
    <div className="space-y-4">
      {parameters.map((param) => (
        <div key={param.name} className="form-group">
          <label className="block text-sm font-medium text-gray-700">
            {param.label}
          </label>
          {param.type === "select" ? (
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              value={values[param.name] || param.default}
              onChange={(e) => onChange(param.name, e.target.value)}
            >
              {param.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={param.type}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              value={values[param.name] || param.default || ""}
              onChange={(e) => onChange(param.name, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
};
