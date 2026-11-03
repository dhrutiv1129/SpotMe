INSERT INTO beta_exercises(id,name,muscle_group,equipment,difficulty,bodyweight,instructions) VALUES
(1,'Leg press','legs','leg-press','BEGINNER',FALSE,'Set the seat so your knees bend comfortably. Keep feet planted and extend without locking your knees.'),
(2,'Goblet squat','legs','dumbbell','BEGINNER',FALSE,'Hold a dumbbell at your chest. Sit down between your hips, then stand with control.'),
(3,'Bodyweight squat','legs','bodyweight','BEGINNER',TRUE,'Stand with feet comfortably apart. Sit down with control, then stand.'),
(4,'Barbell squat','legs','barbell','INTERMEDIATE',FALSE,'Set the rack safeties. Brace your trunk, squat through a comfortable range, then stand.'),
(5,'Chest press machine','chest','chest-press','BEGINNER',FALSE,'Adjust the seat so handles are near mid-chest. Press forward with control.'),
(6,'Dumbbell bench press','chest','dumbbell','BEGINNER',FALSE,'Lie on a bench with feet planted. Lower the dumbbells comfortably and press upward.'),
(7,'Push-up','chest','bodyweight','BEGINNER',TRUE,'Keep your trunk steady. Lower your chest toward the floor and press back up.'),
(8,'Barbell bench press','chest','barbell','INTERMEDIATE',FALSE,'Use a spotter or safeties. Lower the bar with control and press upward.'),
(9,'Lat pulldown','back','lat-pulldown','BEGINNER',FALSE,'Sit securely under the pads. Pull the bar toward the upper chest without swinging.'),
(10,'Dumbbell row','back','dumbbell','BEGINNER',FALSE,'Support your trunk. Pull the dumbbell toward your hip and lower with control.'),
(11,'Pull-up','back','pull-up-bar','ADVANCED',TRUE,'Start from a controlled hang. Pull upward without swinging and lower slowly.'),
(12,'Seated row machine','back','seated-row','BEGINNER',FALSE,'Keep your trunk steady and draw the handles toward your ribs. Return with control.');
INSERT INTO beta_alternatives(original_id,alternative_id,relevance)
SELECT a.id,b.id,90 FROM beta_exercises a CROSS JOIN beta_exercises b
WHERE a.muscle_group=b.muscle_group AND a.id<>b.id;
