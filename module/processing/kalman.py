import numpy as np
import math


class kalman:
    def __init__(self, accel_mean: list):
        self.accel_mean = accel_mean

        self.Initialize()

    def EulerToQuat(self, phi: float, theta: float, psi: float) -> np.ndarray:
        sinPhi = math.sin(phi / 2)
        cosPhi = math.cos(phi / 2)
        cosTheta = math.cos(theta / 2)
        sinTheta = math.sin(theta / 2)
        sinPsi = math.sin(psi / 2)
        cosPsi = math.cos(psi / 2)

        return np.array(
            [
                cosPhi * cosTheta * cosPsi + sinPhi * sinTheta * sinPsi,
                sinPhi * cosTheta * cosPsi - cosPhi * sinTheta * sinPsi,
                cosPhi * sinTheta * cosPsi + sinPhi * cosTheta * sinPsi,
                cosPhi * cosTheta * sinPsi - sinPhi * sinTheta * cosPsi,
            ]
        )

    def Initialize(self):
        accel_mean = self.accel_mean
        euler = np.array(
            [
                [math.atan2(accel_mean[1], accel_mean[2])],
                [
                    math.atan2(
                        accel_mean[0],
                        math.sqrt(
                            math.pow(accel_mean[1], 2) + math.pow(accel_mean[2], 2)
                        ),
                    )
                ],
                [0.0],
            ]
        )
        euler_accel = euler.copy()
        euler_dcm = euler.copy()

        phi = euler[0, 0]
        theta = euler[1, 0]

        euler_quaternion_intng = np.array(euler[0:2, 0:1])
        euler_quaternion_mult = euler_quaternion_intng.copy()

        quaternion_intg = self.EulerToQuat(euler[0, 0], euler[1, 0], euler[2, 0])
        quaternion_mult = quaternion_intg.copy()

        euler_com = np.array([euler[0], euler[1], [0.0]])
        euler_KF = np.array([euler[0], euler[1], [0.0]])
        euler_KF_stack = np.array([euler[0], euler[1], [0.0]])
        euler_EKF_stack = euler.copy()
        x_hat = np.array([euler[0], euler[1], [0.0]])

        H_E = np.eye(3)
        Q_E = 0.0001 * np.eye(3)
        R_E = 0.01 * np.eye(3)
        P_E = np.zeros((3, 3))
        H = np.eye(4)
        Q = 0.0001 * np.eye(4)
        R = 10.0 * np.eye(4)
        P = np.eye(4)
        x = np.array([1.0, 0.0, 0.0, 0.0])

        self.euler = euler
        self.euler_accel = euler_accel
        self.euler_EKF_stack = euler_EKF_stack
        self.P_E = P_E
        self.Q_E = Q_E
        self.H_E = H_E
        self.R_E = R_E

    def EulerAngleUpdate(self, gyro, acc, dt):
        euler = self.euler
        euler_accel = self.euler_accel

        euler_dot_cal = np.array(
            [
                [
                    1.0,
                    math.sin(euler[0, 0]) * math.tan(euler[1, 0]),
                    math.cos(euler[0, 0]) * math.tan(euler[1, 0]),
                ],
                [0.0, math.cos(euler[0, 0]), -math.sin(euler[0, 0])],
                [
                    0.0,
                    math.cos(euler[0, 0]) / math.cos(euler[1, 0]),
                    math.sin(euler[0, 0]) / math.cos(euler[1, 0]),
                ],
            ]
        )
        omega = np.array([[gyro[0]], [gyro[1]], [gyro[2]]])
        euler_dot = euler_dot_cal @ omega
        euler = euler + euler_dot * dt

        euler_accel[0, 0] = math.atan2(acc[1], acc[2])
        euler_accel[1, 0] = -math.atan2(
            acc[0], math.sqrt(math.pow(acc[1], 2) + math.pow(acc[2], 2))
        )

        self.euler = euler
        self.euler_accel = euler_accel

    def ExtendedKalmanFilter(self, gyro, dt):
        euler_EKF_stack = self.euler_EKF_stack
        P_E = self.P_E
        Q_E = self.Q_E
        H_E = self.H_E
        R_E = self.R_E
        euler_accel = self.euler_accel

        x_dot_cal = np.array(
            [
                [
                    1.0,
                    math.sin(euler_EKF_stack[0, 0]) * math.tan(euler_EKF_stack[1, 0]),
                    math.cos(euler_EKF_stack[0, 0]) * math.tan(euler_EKF_stack[1, 0]),
                ],
                [
                    0.0,
                    math.cos(euler_EKF_stack[0, 0]),
                    -math.sin(euler_EKF_stack[0, 0]),
                ],
                [
                    0,
                    math.sin(euler_EKF_stack[0, 0]) / math.cos(euler_EKF_stack[1, 0]),
                    math.cos(euler_EKF_stack[0, 0]) / math.cos(euler_EKF_stack[1, 0]),
                ],
            ]
        )
        temp = np.array([[gyro[0]], [gyro[1]], [gyro[2]]])
        x_dot = x_dot_cal @ temp  # main.cpp L244
        x_hat = euler_EKF_stack + x_dot * dt
        F_cal = np.array(
            [
                [
                    (
                        gyro[1] * math.cos(euler_EKF_stack[0, 0])
                        - gyro[2] * math.sin(euler_EKF_stack[0, 0])
                    )
                    * math.tan(euler_EKF_stack[1, 0]),
                    (
                        gyro[1] * math.sin(euler_EKF_stack[0, 0])
                        + gyro[2] * math.cos(euler_EKF_stack[0, 0])
                    )
                    / math.pow(math.cos(euler_EKF_stack[1, 0]), 2),
                    0.0,
                ],
                [
                    -gyro[1] * math.sin(euler_EKF_stack[0, 0])
                    - gyro[2] * math.cos(euler_EKF_stack[0, 0]),
                    0.0,
                    0.0,
                ],
                [
                    (
                        gyro[1] * math.cos(euler_EKF_stack[0, 0])
                        - gyro[2] * math.sin(euler_EKF_stack[0, 0])
                    )
                    / math.cos(euler_EKF_stack[1, 0]),
                    math.sin(euler_EKF_stack[1, 0])
                    * (
                        gyro[1] * math.sin(euler_EKF_stack[0, 0])
                        + gyro[2] * math.cos(euler_EKF_stack[0, 0])
                    )
                    / math.pow(math.cos(euler_EKF_stack[1, 0]), 2),
                    0.0,
                ],
            ]
        )

        temp2 = np.eye(3)

        F = temp2 + F_cal * dt
        G_cal = [
            [
                1.0,
                math.sin(euler_EKF_stack[0, 0]) * math.tan(euler_EKF_stack[1, 0]),
                math.cos(euler_EKF_stack[0, 0]) * math.tan(euler_EKF_stack[1, 0]),
            ],
            [0.0, math.cos(euler_EKF_stack[0, 0]), -math.sin(euler_EKF_stack[0, 0])],
            [
                0.0,
                math.sin(euler_EKF_stack[0, 0]) / math.cos(euler_EKF_stack[1, 0]),
                math.cos(euler_EKF_stack[0, 0]) / math.cos(euler_EKF_stack[1, 0]),
            ],
        ]
        G = np.multiply(G_cal, dt)
        P_bar = F @ P_E @ np.transpose(F) + G @ Q_E @ np.transpose(G)

        K_E = P_bar @ np.transpose(H_E) @ (np.linalg.inv(H_E @ P_bar @ np.transpose(H_E) + R_E))
        P_E = P_bar - K_E @ H_E @ P_bar

        z = H_E @ euler_accel
        euler_EKF_stack = x_hat + (K_E @ (z - H_E @ x_hat))
        print(euler_EKF_stack)

        self.euler_EKF_stack = euler_EKF_stack
        self.P_E = P_E



if __name__ == "__main__":
    k = kalman([0.0, 0.0, 0.0])
    k.EulerAngleUpdate([1, 2, 3], [0.2, 0.1, -0.12], 0.2)
    k.ExtendedKalmanFilter([0.1, -0.84, 0.12], 0.01)
