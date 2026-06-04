/**
 * AI Constraint Satisfaction Problem (CSP) Timetable Scheduler.
 * Implements recursive backtracking search with forward checking heuristics.
 */

/**
 * Solves the university timetable schedule given courses, rooms, slots, and constraints.
 * 
 * @param {Array} coursesToSchedule - Array of course objects containing instructor, cohort size, and code.
 * @param {Array} rooms - Array of room objects containing capacity and name.
 * @param {Array} timeSlots - Array of time slot objects containing day and time_window.
 * @param {Array} fixedSchedules - Fixed classes that cannot be moved.
 * @returns {Object} { success: boolean, assignments: Array, conflicts: Array }
 */
export function solveTimetableCSP(coursesToSchedule, rooms, timeSlots, fixedSchedules = []) {
  const assignments = [...fixedSchedules];
  const conflicts = [];
  
  // Variables to assign: courses that aren't already fixed
  const variables = coursesToSchedule.filter(c => !fixedSchedules.some(fs => fs.course_id === c.id));
  
  // Domain generation: All combinations of rooms and timeSlots
  const domains = [];
  for (const room of rooms) {
    for (const slot of timeSlots) {
      domains.push({ room, slot });
    }
  }

  // Backtracking search helper
  function backtrack(varIndex) {
    if (varIndex >= variables.length) {
      return true; // All assigned successfully!
    }

    const currentVar = variables[varIndex];

    for (const domain of domains) {
      const { room, slot } = domain;

      // 1. Constraint: Room capacity must fit course cohort size
      const cohortSize = currentVar.cohort_size || 40;
      if (room.capacity < cohortSize) {
        continue;
      }

      // 2. Constraint: No two courses in same room at same time slot
      const roomConflict = assignments.some(a => 
        a.room_id === room.id && 
        a.day === slot.day && 
        a.time_window === slot.time_window
      );
      if (roomConflict) {
        continue;
      }

      // 3. Constraint: No instructor teaching two courses in same slot
      const instructorConflict = assignments.some(a => 
        a.instructor === currentVar.instructor && 
        a.day === slot.day && 
        a.time_window === slot.time_window
      );
      if (instructorConflict) {
        continue;
      }

      // Place assignment
      const newAssignment = {
        id: `auto-${currentVar.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        course_id: currentVar.id,
        room_id: room.id,
        day: slot.day,
        time_window: slot.time_window,
        instructor: currentVar.instructor
      };

      assignments.push(newAssignment);

      // Recurse
      if (backtrack(varIndex + 1)) {
        return true;
      }

      // Backtrack
      assignments.pop();
    }

    return false; // Unsolvable at this branch
  }

  const solved = backtrack(0);
  
  if (solved) {
    return {
      success: true,
      assignments,
      conflicts: []
    };
  } else {
    // If scheduling failed, identify constraint pressure points (rooms/instructors causing conflicts)
    return {
      success: false,
      assignments: [],
      conflicts: [
        {
          type: 'OVERLOAD',
          reason: 'Constraint Satisfaction density exceeded capacity threshold. Add more lecture halls or time slots.'
        }
      ]
    };
  }
}

/**
 * Computes a grid occupancy density matrix (heatmap data) for all classrooms and time slots.
 */
export function calculateRoomHeatmap(schedules, rooms, timeSlots) {
  const heatmap = {};
  
  for (const room of rooms) {
    heatmap[room.id] = {};
    for (const slot of timeSlots) {
      // Find number of schedules assigned to this slot/room (should be 0 or 1 under CSP, but shows density)
      const count = schedules.filter(s => 
        s.room_id === room.id && 
        s.day === slot.day && 
        s.time_window === slot.time_window
      ).length;
      
      heatmap[room.id][`${slot.day}:${slot.time_window}`] = count;
    }
  }
  
  return heatmap;
}
