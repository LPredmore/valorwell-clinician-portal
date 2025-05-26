
import { DateTime } from 'luxon';

// Generate time options for the select dropdown
export const generateTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const formattedHour = hour.toString().padStart(2, '0');
      const formattedMinute = minute.toString().padStart(2, '0');
      options.push(`${formattedHour}:${formattedMinute}`);
    }
  }
  return options;
};

// Format time for display
export const formatDisplayTime = (time: string) => {
  const dt = DateTime.fromFormat(`2023-01-01T${time}`, "yyyy-MM-dd'T'HH:mm");
  return dt.toFormat('h:mm a');
};
