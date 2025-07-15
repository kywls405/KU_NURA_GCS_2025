import math


class rotation_quaternion:
    def __init__(self):
        self.rot_vec = [0, 0, 0]
        self.rot_vec_abs = 0

    def quat_multi(self, q1, q2):
        q3 = [
            q1[0] * q2[0] - q1[1] * q2[1] - q1[2] * q2[2] - q1[3] * q2[3],
            q1[0] * q2[1] + q1[1] * q2[0] + q1[2] * q2[3] - q1[3] * q2[2],
            q1[0] * q2[2] - q1[1] * q2[3] + q1[2] * q2[0] + q1[3] * q2[1],
            q1[0] * q2[3] + q1[1] * q2[2] - q1[2] * q2[1] + q1[3] * q2[0],
        ]
        return q3

    def axis(self, rot, dt):
        r = [[0.0, 0.0], [0.0, 0.0], [0.0, 0.0]]
        for i in range(3):
            rot[i] *= dt * math.pi / 360.0
            r[i][0] = math.sin(rot[i])
            r[i][1] = math.cos(rot[i])
        q = [
            r[0][1] * r[1][1] * r[2][1] + r[0][0] * r[1][0] * r[2][0],
            r[0][0] * r[1][1] * r[2][1] - r[0][1] * r[1][0] * r[2][0],
            r[0][1] * r[1][0] * r[2][1] + r[0][0] * r[1][1] * r[2][0],
            r[0][1] * r[1][1] * r[2][0] + r[0][0] * r[1][0] * r[2][1],
        ]
        return q
